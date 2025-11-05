package com.gemetrics.plugin;

import lombok.extern.slf4j.Slf4j;
import net.runelite.client.config.ConfigManager;
import okhttp3.*;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Singleton
public class AuthenticationService
{
	@Inject
	private GeMetricsConfig config;

	@Inject
	private ConfigManager configManager;

	private final OkHttpClient httpClient;
	private final Gson gson;
	private String accessToken;
	private String refreshToken;

	public AuthenticationService()
	{
		this.httpClient = new OkHttpClient();
		this.gson = new GsonBuilder().create();
	}

	public void initialize()
	{
		// Load saved tokens from config
		loadSavedTokens();
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
				
				// Save tokens to config
				saveTokens();
				
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
		this.accessToken = null;
		this.refreshToken = null;
		saveTokens();
		log.info("User logged out");
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
}

