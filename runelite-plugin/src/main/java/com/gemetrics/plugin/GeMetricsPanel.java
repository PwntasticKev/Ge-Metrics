package com.gemetrics.plugin;

import lombok.extern.slf4j.Slf4j;
import net.runelite.client.ui.PluginPanel;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.io.IOException;

@Slf4j
public class GeMetricsPanel extends PluginPanel
{
	private final AuthenticationService authService;
	private final GeMetricsConfig config;
	
	private JLabel statusLabel;
	private JTextField emailField;
	private JPasswordField passwordField;
	private JTextField usernameField;
	private JTextField nameField;
	private JButton loginButton;
	private JButton registerButton;
	private JLabel loggedInLabel;
	private JButton logoutButton;
	private boolean isLoggedIn = false;

	public GeMetricsPanel(AuthenticationService authService, GeMetricsConfig config)
	{
		this.authService = authService;
		this.config = config;
		
		setBorder(new EmptyBorder(10, 10, 10, 10));
		setLayout(new BorderLayout());
		
		buildUI();
		checkLoginStatus();
	}

	private void buildUI()
	{
		JPanel mainPanel = new JPanel();
		mainPanel.setLayout(new BoxLayout(mainPanel, BoxLayout.Y_AXIS));
		mainPanel.setBorder(new EmptyBorder(10, 0, 0, 0));

		// Title
		JLabel titleLabel = new JLabel("<html><h2>GE Metrics Trade Tracker</h2></html>");
		titleLabel.setBorder(new EmptyBorder(0, 0, 20, 0));
		mainPanel.add(titleLabel);

		// Status label
		statusLabel = new JLabel("");
		statusLabel.setForeground(Color.GRAY);
		statusLabel.setBorder(new EmptyBorder(0, 0, 20, 0));
		mainPanel.add(statusLabel);

		// Login form (shown when not logged in)
		JPanel loginPanel = createLoginPanel();
		mainPanel.add(loginPanel);

		// Logged in panel (shown when logged in)
		JPanel loggedInPanel = createLoggedInPanel();
		mainPanel.add(loggedInPanel);

		// Settings section
		JPanel settingsPanel = createSettingsPanel();
		mainPanel.add(settingsPanel);

		// Add scroll pane
		JScrollPane scrollPane = new JScrollPane(mainPanel);
		scrollPane.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
		add(scrollPane, BorderLayout.CENTER);
	}

	private JPanel createLoginPanel()
	{
		JPanel panel = new JPanel();
		panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
		panel.setBorder(BorderFactory.createTitledBorder("Login"));
		panel.setVisible(!isLoggedIn);

		// Email field
		JLabel emailLabel = new JLabel("Email:");
		emailField = new JTextField(20);
		JPanel emailPanel = new JPanel(new BorderLayout());
		emailPanel.add(emailLabel, BorderLayout.WEST);
		emailPanel.add(emailField, BorderLayout.CENTER);
		emailPanel.setBorder(new EmptyBorder(5, 5, 5, 5));
		panel.add(emailPanel);

		// Password field
		JLabel passwordLabel = new JLabel("Password:");
		passwordField = new JPasswordField(20);
		JPanel passwordPanel = new JPanel(new BorderLayout());
		passwordPanel.add(passwordLabel, BorderLayout.WEST);
		passwordPanel.add(passwordField, BorderLayout.CENTER);
		passwordPanel.setBorder(new EmptyBorder(5, 5, 5, 5));
		panel.add(passwordPanel);

		// Login button
		loginButton = new JButton("Login");
		loginButton.addActionListener(e -> handleLogin());
		loginButton.setAlignmentX(Component.CENTER_ALIGNMENT);
		loginButton.setBorder(new EmptyBorder(10, 5, 5, 5));
		panel.add(loginButton);

		// Register form toggle button
		JButton showRegisterButton = new JButton("Create Account");
		showRegisterButton.addActionListener(e -> {
			JPanel registerPanel = findRegisterPanel();
			if (registerPanel != null)
			{
				registerPanel.setVisible(!registerPanel.isVisible());
			}
		});
		showRegisterButton.setAlignmentX(Component.CENTER_ALIGNMENT);
		showRegisterButton.setBorder(new EmptyBorder(5, 5, 5, 5));
		panel.add(showRegisterButton);

		// Register form (collapsible)
		JPanel registerPanel = createRegisterPanel();
		panel.add(registerPanel);

		return panel;
	}

	private JPanel findRegisterPanel()
	{
		Component[] components = getComponents();
		for (Component comp : components)
		{
			if (comp instanceof JScrollPane)
			{
				JScrollPane scrollPane = (JScrollPane) comp;
				Component view = scrollPane.getViewport().getView();
				if (view instanceof JPanel)
				{
					JPanel found = findPanelByTitle((JPanel) view, "Create Account");
					if (found != null) return found;
				}
			}
		}
		return null;
	}

	private JPanel findPanelByTitle(JPanel parent, String title)
	{
		Component[] components = parent.getComponents();
		for (Component comp : components)
		{
			if (comp instanceof JPanel)
			{
				JPanel subPanel = (JPanel) comp;
				if (subPanel.getBorder() instanceof javax.swing.border.TitledBorder)
				{
					javax.swing.border.TitledBorder titledBorder = (javax.swing.border.TitledBorder) subPanel.getBorder();
					if (title.equals(titledBorder.getTitle()))
					{
						return subPanel;
					}
				}
			}
		}
		return null;
	}

	private JPanel createRegisterPanel()
	{
		JPanel panel = new JPanel();
		panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
		panel.setBorder(BorderFactory.createTitledBorder("Create Account"));
		panel.setVisible(false);

		// Username field
		JLabel usernameLabel = new JLabel("Username:");
		usernameField = new JTextField(20);
		JPanel usernamePanel = new JPanel(new BorderLayout());
		usernamePanel.add(usernameLabel, BorderLayout.WEST);
		usernamePanel.add(usernameField, BorderLayout.CENTER);
		usernamePanel.setBorder(new EmptyBorder(5, 5, 5, 5));
		panel.add(usernamePanel);

		// Name field
		JLabel nameLabel = new JLabel("Full Name:");
		nameField = new JTextField(20);
		JPanel namePanel = new JPanel(new BorderLayout());
		namePanel.add(nameLabel, BorderLayout.WEST);
		namePanel.add(nameField, BorderLayout.CENTER);
		namePanel.setBorder(new EmptyBorder(5, 5, 5, 5));
		panel.add(namePanel);

		// Register button
		registerButton = new JButton("Register");
		registerButton.addActionListener(e -> handleRegister());
		registerButton.setAlignmentX(Component.CENTER_ALIGNMENT);
		registerButton.setBorder(new EmptyBorder(10, 5, 5, 5));
		panel.add(registerButton);

		return panel;
	}

	private JPanel createLoggedInPanel()
	{
		JPanel panel = new JPanel();
		panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
		panel.setBorder(BorderFactory.createTitledBorder("Account"));
		panel.setVisible(isLoggedIn);

		loggedInLabel = new JLabel("Logged in successfully!");
		loggedInLabel.setBorder(new EmptyBorder(5, 5, 5, 5));
		panel.add(loggedInLabel);

		logoutButton = new JButton("Logout");
		logoutButton.addActionListener(e -> handleLogout());
		logoutButton.setAlignmentX(Component.CENTER_ALIGNMENT);
		logoutButton.setBorder(new EmptyBorder(10, 5, 5, 5));
		panel.add(logoutButton);

		return panel;
	}

	private JPanel createSettingsPanel()
	{
		JPanel panel = new JPanel();
		panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
		panel.setBorder(BorderFactory.createTitledBorder("Settings"));

		// API URL
		JLabel apiUrlLabel = new JLabel("API URL:");
		JTextField apiUrlField = new JTextField(config.apiUrl());
		apiUrlField.setEditable(false);
		JPanel apiUrlPanel = new JPanel(new BorderLayout());
		apiUrlPanel.add(apiUrlLabel, BorderLayout.WEST);
		apiUrlPanel.add(apiUrlField, BorderLayout.CENTER);
		apiUrlPanel.setBorder(new EmptyBorder(5, 5, 5, 5));
		panel.add(apiUrlPanel);

		// Enable tracking checkbox
		JCheckBox enableCheckbox = new JCheckBox("Enable Trade Tracking", config.enabled());
		enableCheckbox.addActionListener(e -> {
			// Update config
			// This would need to be implemented in ConfigManager
		});
		enableCheckbox.setBorder(new EmptyBorder(5, 5, 5, 5));
		panel.add(enableCheckbox);

		return panel;
	}

	private void handleLogin()
	{
		String email = emailField.getText().trim();
		String password = new String(passwordField.getPassword());

		if (email.isEmpty() || password.isEmpty())
		{
			setStatus("Please enter email and password", Color.RED);
			return;
		}

		loginButton.setEnabled(false);
		setStatus("Logging in...", Color.BLUE);

		// Run login in background thread (network operations should NOT be on EDT)
		new Thread(() -> {
			try
			{
				boolean success = authService.login(email, password);
				SwingUtilities.invokeLater(() -> {
					if (success)
					{
						setStatus("Login successful!", Color.GREEN);
						isLoggedIn = true;
						updateUI();
					}
					else
					{
						setStatus("Login failed. Please check your credentials.", Color.RED);
					}
					loginButton.setEnabled(true);
				});
			}
			catch (IOException e)
			{
				SwingUtilities.invokeLater(() -> {
					setStatus("Error: " + e.getMessage(), Color.RED);
					log.error("Login error", e);
					loginButton.setEnabled(true);
				});
			}
		}).start();
	}

	private void handleRegister()
	{
		String email = emailField.getText().trim();
		String password = new String(passwordField.getPassword());
		String username = usernameField.getText().trim();
		String name = nameField.getText().trim();

		if (email.isEmpty() || password.isEmpty() || username.isEmpty() || name.isEmpty())
		{
			setStatus("Please fill in all fields", Color.RED);
			return;
		}

		registerButton.setEnabled(false);
		setStatus("Registering...", Color.BLUE);

		// Run registration in background thread (network operations should NOT be on EDT)
		new Thread(() -> {
			try
			{
				boolean success = authService.register(email, username, password, name);
				SwingUtilities.invokeLater(() -> {
					if (success)
					{
						setStatus("Registration successful! Logged in.", Color.GREEN);
						isLoggedIn = true;
						updateUI();
					}
					else
					{
						setStatus("Registration failed. Please try again.", Color.RED);
					}
					registerButton.setEnabled(true);
				});
			}
			catch (IOException e)
			{
				SwingUtilities.invokeLater(() -> {
					setStatus("Error: " + e.getMessage(), Color.RED);
					log.error("Registration error", e);
					registerButton.setEnabled(true);
				});
			}
		}).start();
	}

	private void handleLogout()
	{
		// Clear tokens
		authService.logout();
		isLoggedIn = false;
		setStatus("Logged out", Color.GRAY);
		updateUI();
	}

	private void checkLoginStatus()
	{
		isLoggedIn = authService.isAuthenticated();
		updateUI();
	}

	private void updateUI()
	{
		Component[] components = getComponents();
		for (Component comp : components)
		{
			if (comp instanceof JScrollPane)
			{
				JScrollPane scrollPane = (JScrollPane) comp;
				Component view = scrollPane.getViewport().getView();
				if (view instanceof JPanel)
				{
					updatePanelVisibility((JPanel) view);
				}
			}
		}
		revalidate();
		repaint();
	}

	private void updatePanelVisibility(JPanel panel)
	{
		Component[] components = panel.getComponents();
		for (Component comp : components)
		{
			if (comp instanceof JPanel)
			{
				JPanel subPanel = (JPanel) comp;
				String borderTitle = "";
				if (subPanel.getBorder() instanceof javax.swing.border.TitledBorder)
				{
					javax.swing.border.TitledBorder titledBorder = (javax.swing.border.TitledBorder) subPanel.getBorder();
					borderTitle = titledBorder.getTitle();
				}
				
				if ("Login".equals(borderTitle))
				{
					subPanel.setVisible(!isLoggedIn);
				}
				else if ("Account".equals(borderTitle))
				{
					subPanel.setVisible(isLoggedIn);
				}
			}
		}
	}

	private void setStatus(String message, Color color)
	{
		statusLabel.setText(message);
		statusLabel.setForeground(color);
	}
}

