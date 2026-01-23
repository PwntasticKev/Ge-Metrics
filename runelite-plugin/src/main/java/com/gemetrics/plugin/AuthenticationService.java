package com.gemetrics.plugin;

import lombok.extern.slf4j.Slf4j;
import net.runelite.client.config.ConfigManager;
import okhttp3.*;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Base64;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Slf4j
@Singleton
public class AuthenticationService
{
	@Inject
	private GeMetricsConfig config;

	@Inject
	private ConfigManager configManager;
	
	@Inject
	private NotificationService notificationService;

	private final OkHttpClient httpClient;
	private final Gson gson;
	private final ReentrantLock authLock;
	private final ScheduledExecutorService executorService;
	
	private String accessToken;
	private String refreshToken;
	private Instant tokenExpiryTime;
	private boolean isRefreshing;
	private static final long TOKEN_REFRESH_BUFFER_MINUTES = 5;

	public AuthenticationService()
	{
		this.httpClient = new OkHttpClient();
		this.gson = new GsonBuilder().create();
		this.authLock = new ReentrantLock();
		this.executorService = Executors.newSingleThreadScheduledExecutor(r -> {
			Thread thread = new Thread(r, "GeMetrics-Auth");
			thread.setDaemon(true);
			return thread;
		});
		this.isRefreshing = false;
	}

	public void initialize()
	{
		// Load saved tokens from config
		loadSavedTokens();
		
		// Schedule periodic token validation
		executorService.scheduleAtFixedRate(this::checkAndRefreshToken, 1, 1, TimeUnit.MINUTES);
	}

	public boolean login(String email, String password) throws IOException
	{
		LoginRequest request = new LoginRequest();
		request.setEmail(email);
		request.setPassword(password);

		// tRPC HTTP format: POST /trpc/{router}.{procedure}
		// Body format: { "input": {...} }
		Map<String, Object> trpcRequest = new HashMap<>();
		trpcRequest.put("input", request);
		
		String json = gson.toJson(trpcRequest);
		
		RequestBody body = RequestBody.create(
			json,
			MediaType.parse("application/json; charset=utf-8")
		);

		Request httpRequest = new Request.Builder()
			.url(config.apiUrl() + "/trpc/auth.login")
			.post(body)
			.addHeader("Content-Type", "application/json")
			.build();

		try (Response response = httpClient.newCall(httpRequest).execute())
		{
			if (response.isSuccessful())
			{
				String responseBody = response.body().string();
				// tRPC response format: { "result": { "data": {...} } }
				// Parse the nested structure
				Map<String, Object> trpcResponse = gson.fromJson(responseBody, Map.class);
				Map<String, Object> result = (Map<String, Object>) trpcResponse.get("result");
				Map<String, Object> data = (Map<String, Object>) result.get("data");
				
				LoginResponse loginResponse = gson.fromJson(gson.toJson(data), LoginResponse.class);
				
				this.accessToken = loginResponse.getAccessToken();
				this.refreshToken = loginResponse.getRefreshToken();
				
				// Parse token expiry
				parseTokenExpiry(this.accessToken);
				
				// Save tokens to config
				saveTokens();
				
				// Notify success
				if (notificationService != null)
				{
					notificationService.showLoginSuccess(email);
				}
				
				return true;
			}
			else
			{
				String errorBody = response.body().string();
				log.error("Login failed: {} - {}", response.code(), errorBody);
				return false;
			}
		}
	}

	public boolean register(String email, String username, String password, String name) throws IOException
	{
		RegisterRequest request = new RegisterRequest();
		request.setEmail(email);
		request.setUsername(username);
		request.setPassword(password);
		request.setName(name);

		// tRPC HTTP format
		Map<String, Object> trpcRequest = new HashMap<>();
		trpcRequest.put("input", request);
		
		String json = gson.toJson(trpcRequest);
		
		RequestBody body = RequestBody.create(
			json,
			MediaType.parse("application/json; charset=utf-8")
		);

		Request httpRequest = new Request.Builder()
			.url(config.apiUrl() + "/trpc/auth.register")
			.post(body)
			.addHeader("Content-Type", "application/json")
			.build();

		try (Response response = httpClient.newCall(httpRequest).execute())
		{
			if (response.isSuccessful())
			{
				// After registration, automatically login
				return login(email, password);
			}
			else
			{
				String errorBody = response.body().string();
				log.error("Registration failed: {} - {}", response.code(), errorBody);
				return false;
			}
		}
	}

	public String getAccessToken()
	{
		return accessToken != null ? accessToken : config.accessToken();
	}

	public boolean isAuthenticated()
	{
		return getAccessToken() != null && !getAccessToken().isEmpty();
	}

	public void logout()
	{
		authLock.lock();
		try
		{
			this.accessToken = null;
			this.refreshToken = null;
			this.tokenExpiryTime = null;
			this.isRefreshing = false;
			saveTokens();
			
			if (notificationService != null)
			{
				notificationService.showLogoutSuccess();
			}
			
			log.info("User logged out");
		}
		finally
		{
			authLock.unlock();
		}
	}

	private void loadSavedTokens()
	{
		// Load tokens from RuneLite config
		this.accessToken = config.accessToken();
		this.refreshToken = config.refreshToken();
		
		if (accessToken != null)
		{
			log.info("Loaded saved access token");
		}
	}

	private void saveTokens()
	{
		// Save tokens to RuneLite config using ConfigManager
		configManager.setConfiguration("gemetrics", "accessToken", accessToken);
		configManager.setConfiguration("gemetrics", "refreshToken", refreshToken);
		log.info("Saved tokens to config");
	}
	
	// Enhanced token management methods
	
	private void parseTokenExpiry(String token)
	{
		if (token == null) return;
		
		try
		{
			// JWT tokens have 3 parts: header.payload.signature
			String[] parts = token.split("\\.");
			if (parts.length < 2) return;
			
			// Decode the payload (second part)
			String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
			Map<String, Object> claims = gson.fromJson(payload, Map.class);
			
			// Get expiry time (exp claim)
			Object exp = claims.get("exp");
			if (exp instanceof Number)
			{
				long expirySeconds = ((Number) exp).longValue();
				this.tokenExpiryTime = Instant.ofEpochSecond(expirySeconds);
				log.debug("Token expires at: {}", this.tokenExpiryTime);
			}
		}
		catch (Exception e)
		{
			log.warn("Failed to parse token expiry", e);
		}
	}
	
	public boolean isTokenExpiring()
	{
		if (tokenExpiryTime == null) return false;
		
		Instant refreshThreshold = Instant.now().plusSeconds(TOKEN_REFRESH_BUFFER_MINUTES * 60);
		return tokenExpiryTime.isBefore(refreshThreshold);
	}
	
	private void checkAndRefreshToken()
	{
		if (!isAuthenticated()) return;
		
		if (isTokenExpiring() && !isRefreshing)
		{
			log.info("Token is expiring soon, attempting refresh");
			executorService.execute(this::refreshTokenAsync);
		}
	}
	
	private void refreshTokenAsync()
	{
		try
		{
			refreshTokenIfNeeded();
		}
		catch (Exception e)
		{
			log.error("Background token refresh failed", e);
			if (notificationService != null)
			{
				notificationService.showAuthenticationError();
			}
		}
	}
	
	public boolean refreshTokenIfNeeded()
	{
		if (!isAuthenticated() || refreshToken == null) return false;
		
		authLock.lock();
		try
		{
			// Check if another thread is already refreshing
			if (isRefreshing) return true;
			
			// Check if we actually need to refresh
			if (!isTokenExpiring()) return true;
			
			isRefreshing = true;
			return performTokenRefresh();
		}
		finally
		{
			isRefreshing = false;
			authLock.unlock();
		}
	}
	
	private boolean performTokenRefresh()
	{
		try
		{
			log.info("Refreshing access token");
			
			RefreshTokenRequest request = new RefreshTokenRequest();
			request.setRefreshToken(refreshToken);
			
			Map<String, Object> trpcRequest = new HashMap<>();
			trpcRequest.put("input", request);
			
			String json = gson.toJson(trpcRequest);
			RequestBody body = RequestBody.create(json, MediaType.parse("application/json"));
			
			Request httpRequest = new Request.Builder()
				.url(config.apiUrl() + "/trpc/auth.refresh")
				.post(body)
				.addHeader("Content-Type", "application/json")
				.build();
			
			try (Response response = httpClient.newCall(httpRequest).execute())
			{
				if (response.isSuccessful())
				{
					String responseBody = response.body().string();
					Map<String, Object> trpcResponse = gson.fromJson(responseBody, Map.class);
					Map<String, Object> result = (Map<String, Object>) trpcResponse.get("result");
					Map<String, Object> data = (Map<String, Object>) result.get("data");
					
					RefreshTokenResponse refreshResponse = gson.fromJson(gson.toJson(data), RefreshTokenResponse.class);
					
					this.accessToken = refreshResponse.getAccessToken();
					parseTokenExpiry(this.accessToken);
					saveTokens();
					
					log.info("Token refreshed successfully");
					return true;
				}
				else
				{
					log.error("Token refresh failed: {}", response.code());
					
					// If refresh fails, clear tokens and require re-login
					if (response.code() == 401)
					{
						clearTokens();
						if (notificationService != null)
						{
							notificationService.showAuthenticationError();
						}
					}
					return false;
				}
			}
		}
		catch (IOException e)
		{
			log.error("Token refresh request failed", e);
			return false;
		}
	}
	
	private void clearTokens()
	{
		this.accessToken = null;
		this.refreshToken = null;
		this.tokenExpiryTime = null;
		saveTokens();
	}
	
	public void handleAuthenticationError()
	{
		log.warn("Authentication error occurred, clearing tokens");
		authLock.lock();
		try
		{
			clearTokens();
			if (notificationService != null)
			{
				notificationService.showAuthenticationError();
			}
		}
		finally
		{
			authLock.unlock();
		}
	}
	
	public void shutdown()
	{
		if (executorService != null && !executorService.isShutdown())
		{
			executorService.shutdown();
			try
			{
				if (!executorService.awaitTermination(5, TimeUnit.SECONDS))
				{
					executorService.shutdownNow();
				}
			}
			catch (InterruptedException e)
			{
				executorService.shutdownNow();
				Thread.currentThread().interrupt();
			}
		}
	}
	
	// Helper classes for refresh token
	private static class RefreshTokenRequest
	{
		private String refreshToken;
		
		public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
		public String getRefreshToken() { return refreshToken; }
	}
	
	private static class RefreshTokenResponse
	{
		private String accessToken;
		
		public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
		public String getAccessToken() { return accessToken; }
	}
}

