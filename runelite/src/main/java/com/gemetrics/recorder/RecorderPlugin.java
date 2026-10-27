package com.gemetrics.recorder;

import com.google.gson.Gson;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;
import net.runelite.api.Client;
import net.runelite.api.GameState;
import net.runelite.api.GrandExchangeOffer;
import net.runelite.api.events.GameStateChanged;
import net.runelite.api.events.GrandExchangeOfferChanged;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.config.RuneScapeProfile;
import net.runelite.client.config.RuneScapeProfileType;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.events.ProfileChanged;
import net.runelite.client.events.RuneScapeProfileChanged;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;
import net.runelite.client.ui.PluginPanel;
import net.runelite.client.util.Filepath;

@PluginDescriptor(name = "GE Metrics Evidence (scaffold)", internalName = "ge-metrics-evidence", description = "Local read-only observations; explicit file export", enabledByDefault = false)
public final class RecorderPlugin extends Plugin {
    @Inject private Client client;
    @Inject private ConfigManager config;
    @Inject private ClientToolbar toolbar;
    @Inject private Gson gson;
    private ThreadPoolExecutor writer;
    private FileJournalStorage storage;
    private Journal journal;
    private NavigationButton navigation;
    private volatile Panel panel;
    private volatile boolean blocked;
    private volatile String blockedMessage;
    private volatile String selectedScope;
    private String session, context;
    private final boolean[] seen = new boolean[8];
    private String boundaryReason = "STARTUP";

    @Override protected void startUp() {
        if (writer != null && !writer.isTerminated()) throw new IllegalStateException("Previous local writer is still closing; retry after it exits");
        blockedMessage = null; blocked = false; selectedScope = null; journal = null; storage = null; context = null;
        reset("STARTUP");
        writer = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(256), r -> {
            Thread t = new Thread(r, "ge-metrics-local-writer"); t.setDaemon(true); return t;
        });
        panel = new Panel();
        BufferedImage icon = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
        java.awt.Graphics2D g = icon.createGraphics(); g.setColor(new Color(225, 185, 80)); g.fillRect(3, 3, 10, 10); g.dispose();
        navigation = NavigationButton.builder().tooltip("GE Metrics evidence").icon(icon).panel(panel).priority(8).build();
        toolbar.addNavigation(navigation);
        submit(() -> {
            Filepath dir = getPluginDirectory(); dir.createDirectories();
            storage = new FileJournalStorage(dir.joinSegment("observations-v1.jsonl"));
            journal = new Journal(storage, gson);
            status("Ready; waiting for resolved account. Coverage unknown.");
        });
    }
    private void reset(String reason) { session = UUID.randomUUID().toString(); Arrays.fill(seen, false); boundaryReason = reason; selectedScope = null; }
    @Subscribe public void onProfileChanged(ProfileChanged e) { context = null; reset("RECONNECT"); }
    @Subscribe public void onRuneScapeProfileChanged(RuneScapeProfileChanged e) { context = null; reset("RECONNECT"); }
    @Subscribe public void onGameStateChanged(GameStateChanged e) {
        if (e.getGameState() == GameState.LOGGING_IN) reset("LOGIN");
        else if (e.getGameState() != GameState.LOGGED_IN && e.getGameState() != GameState.LOADING) reset("RECONNECT");
    }
    @Subscribe public void onGrandExchangeOfferChanged(GrandExchangeOfferChanged e) {
        if (blocked || client.getGameState() != GameState.LOGGED_IN || e.getSlot() < 0 || e.getSlot() > 7) return;
        String rsKey = config.getRSProfileKey();
        if (rsKey == null || config.getProfile() == null) { selectedScope = null; status("Identity unresolved; observation skipped."); reset("RECONNECT"); return; }
        RuneScapeProfile profile = config.getRSProfiles().stream().filter(p -> p.getKey().equals(rsKey)
            && p.getAccountHash() == client.getAccountHash() && p.getAccountHash() != RuneScapeProfile.ACCOUNT_HASH_INVALID
            && p.getType() == RuneScapeProfileType.getCurrent(client)).findFirst().orElse(null);
        if (profile == null) { reset("RECONNECT"); status("Identity unresolved; observation skipped."); return; }
        String key = config.getProfile().getId() + ":" + rsKey + ":" + profile.getType().name();
        if (!key.equals(context)) { if (context != null) reset("RECONNECT"); context = key; }
        selectedScope = key;
        GrandExchangeOffer offer = e.getOffer();
        try {
            Reducer.Observation snapshot = offer.getState().name().equals("EMPTY") ? Reducer.Observation.empty() :
                new Reducer.Observation(offer.getState().name(), offer.getItemId(), offer.getTotalQuantity(), offer.getQuantitySold(), offer.getPrice(), offer.getSpent());
            int slot = e.getSlot(), tick = client.getTickCount();
            // No initialization-complete signal: every EMPTY preserves a stale populated baseline.
            String reason = seen[slot] ? "LIVE" : boundaryReason;
            seen[slot] = true;
            String capturedSession = session, at = Instant.now().toString(), mode = profile.getType().name();
            submit(() -> {
                Reducer.Event event = journal.observe(key, mode, slot, reason, capturedSession, at, tick, snapshot);
                if (event != null) status("Slot " + (slot + 1) + " " + event.state + " / " + event.continuity
                    + "; observed " + event.observedAt + "; item " + event.itemId + "; quantity " + event.quantitySold + "/" + event.totalQuantity
                    + "; limit GP " + event.limitPriceGp + "; raw spent GP " + event.spentGp + "; collection UNKNOWN");
            });
        } catch (RuntimeException ex) { block("Malformed observation; recording stopped."); }
    }
    private interface Work { void run() throws Exception; }
    private void submit(Work work) {
        if (blocked || writer == null) return;
        try { writer.execute(() -> { if (!blocked) try { work.run(); } catch (Exception e) { block("Recording blocked: " + e.getMessage()); } }); }
        catch (java.util.concurrent.RejectedExecutionException e) { block("Writer queue full/closed; recording stopped. Coverage lost."); }
    }
    private synchronized void block(String message) {
        if (blocked) return;
        blockedMessage = message;
        blocked = true;
        status(message);
    }
    private void status(String message) {
        Panel target = panel;
        if (target != null) SwingUtilities.invokeLater(() -> {
            if (target != panel) return;
            // Check on the EDT: a successful in-flight append (or already queued UI
            // update) must never replace the warning after capture is blocked.
            String warning = blockedMessage;
            if (blocked && warning == null) return; // shutdown
            target.status.setText("<html>" + escape(warning == null ? message : warning) + "</html>");
        });
    }
    private static String escape(String value) { return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"); }
    private void export() {
        final String scope = selectedScope;
        if (scope == null || blocked) { status("Export unavailable: resolve account and check recorder status."); return; }
        List<Filepath> files = new Filepath.Chooser().setIsSave().setAcceptsFiles().setDialogTitle("Export current account evidence")
            .setFileName("ge-metrics-evidence.json").setDefaultExtension("json").showDialog(panel);
        if (files == null || files.isEmpty()) return;
        Filepath file = files.get(0);
        // Never overwrite an existing file, including the active log or credentials selected accidentally.
        if (file.exists()) { JOptionPane.showMessageDialog(panel, "Choose a new filename; existing files are never overwritten."); return; }
        submit(() -> {
            String json = journal.exportJson(scope, Instant.now().toString());
            try (java.nio.channels.FileChannel channel = file.openFileChannel(java.nio.file.StandardOpenOption.CREATE_NEW, java.nio.file.StandardOpenOption.WRITE)) {
                java.nio.ByteBuffer bytes = java.nio.ByteBuffer.wrap(json.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                while (bytes.hasRemaining()) channel.write(bytes); channel.force(true);
            }
            status("Export complete for selected account scope. Historical observations only.");
        });
    }
    @Override protected void shutDown() {
        blocked = true; selectedScope = null;
        if (navigation != null) toolbar.removeNavigation(navigation);
        ThreadPoolExecutor oldWriter = writer;
        if (oldWriter != null) {
            // Discard queued captures after shutdown; next startup always establishes fresh baselines.
            oldWriter.getQueue().clear();
            oldWriter.execute(() -> { if (storage != null) try { storage.close(); } catch (IOException ignored) { /* restart will validate log */ } });
            oldWriter.shutdown();
        }
    }
    private final class Panel extends PluginPanel {
        private static final long serialVersionUID = 1L;
        final JLabel status = new JLabel("<html>Opening local evidence log…</html>");
        Panel() {
            setLayout(new BorderLayout(0, 12));
            add(new JLabel("<html>GE Metrics scaffold<br>Read-only local observations.<br>Fills, tax, net proceeds and collection are not inferred across gaps.</html>"), BorderLayout.NORTH);
            add(status, BorderLayout.CENTER);
            JButton export = new JButton("Export current account JSON"); export.addActionListener(e -> export()); add(export, BorderLayout.SOUTH);
        }
    }
}
