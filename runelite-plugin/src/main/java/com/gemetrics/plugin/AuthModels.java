package com.gemetrics.plugin;

import lombok.Data;

@Data
class LoginRequest
{
	private String email;
	private String password;
}

@Data
class LoginResponse
{
	private String accessToken;
	private String refreshToken;
	private User user;

	@Data
	static class User
	{
		private int id;
		private String email;
		private String username;
		private String name;
	}
}

@Data
class RegisterRequest
{
	private String email;
	private String username;
	private String password;
	private String name;
}

@Data
class RegisterResponse
{
	private String accessToken;
	private String refreshToken;
	private LoginResponse.User user;
}

