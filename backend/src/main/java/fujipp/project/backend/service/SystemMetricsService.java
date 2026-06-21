package fujipp.project.backend.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.hardware.NetworkIF;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;

import java.lang.management.ManagementFactory;
import java.util.List;

/**
 * Reads real host metrics (CPU / RAM / disk / network) via OSHI. The instance keeps
 * the previous CPU tick array and network byte counters so each {@link #capture()}
 * reports the rate since the last call. {@code capture()} is synchronized because the
 * scheduled collector and on-demand admin requests share that rolling state.
 */
@Service
public class SystemMetricsService {

    private static final Logger log = LoggerFactory.getLogger(SystemMetricsService.class);

    private final SystemInfo systemInfo = new SystemInfo();
    private final HardwareAbstractionLayer hardware = systemInfo.getHardware();
    private final OperatingSystem os = systemInfo.getOperatingSystem();
    private final CentralProcessor processor = hardware.getProcessor();

    private long[] previousTicks;
    private long previousNetBytesRecv;
    private long previousNetBytesSent;
    private long previousNetSampleAtNanos;

    /** Immutable point-in-time host reading. Fields may be null if a probe failed. */
    public record HostSnapshot(
        Double cpuPercent,
        double memUsedBytes,
        double memTotalBytes,
        Double memPercent,
        double diskUsedBytes,
        double diskTotalBytes,
        Double diskPercent,
        double networkInKbps,
        double networkOutKbps,
        long uptimeSeconds,
        int cpuCores,
        String osDescription
    ) {}

    @PostConstruct
    void init() {
        try {
            previousTicks = processor.getSystemCpuLoadTicks();
            long[] net = totalNetworkBytes();
            previousNetBytesRecv = net[0];
            previousNetBytesSent = net[1];
            previousNetSampleAtNanos = System.nanoTime();
        } catch (RuntimeException | LinkageError e) {
            log.warn("OSHI initialisation failed; system metrics may be unavailable", e);
        }
    }

    public synchronized HostSnapshot capture() {
        Double cpuPercent = null;
        try {
            double load = processor.getSystemCpuLoadBetweenTicks(previousTicks);
            previousTicks = processor.getSystemCpuLoadTicks();
            cpuPercent = round(load * 100.0);
        } catch (RuntimeException | LinkageError e) {
            log.debug("CPU load read failed", e);
        }

        double memTotal = 0;
        double memUsed = 0;
        Double memPercent = null;
        try {
            GlobalMemory memory = hardware.getMemory();
            memTotal = memory.getTotal();
            memUsed = memTotal - memory.getAvailable();
            memPercent = memTotal > 0 ? round(memUsed / memTotal * 100.0) : null;
        } catch (RuntimeException | LinkageError e) {
            log.debug("Memory read failed", e);
        }

        double diskTotal = 0;
        double diskUsed = 0;
        Double diskPercent = null;
        try {
            OSFileStore primary = primaryFileStore();
            if (primary != null) {
                diskTotal = primary.getTotalSpace();
                diskUsed = diskTotal - primary.getUsableSpace();
                diskPercent = diskTotal > 0 ? round(diskUsed / diskTotal * 100.0) : null;
            }
        } catch (RuntimeException | LinkageError e) {
            log.debug("Disk read failed", e);
        }

        double inKbps = 0;
        double outKbps = 0;
        try {
            long[] net = totalNetworkBytes();
            long now = System.nanoTime();
            double elapsedSeconds = (now - previousNetSampleAtNanos) / 1_000_000_000.0;
            if (elapsedSeconds > 0 && previousNetSampleAtNanos > 0) {
                inKbps = round(Math.max(0, net[0] - previousNetBytesRecv) * 8.0 / 1000.0 / elapsedSeconds);
                outKbps = round(Math.max(0, net[1] - previousNetBytesSent) * 8.0 / 1000.0 / elapsedSeconds);
            }
            previousNetBytesRecv = net[0];
            previousNetBytesSent = net[1];
            previousNetSampleAtNanos = now;
        } catch (RuntimeException | LinkageError e) {
            log.debug("Network read failed", e);
        }

        long uptime = 0;
        int cores = 0;
        String osDescription = "unknown";
        try {
            uptime = os.getSystemUptime();
            cores = processor.getLogicalProcessorCount();
            osDescription = os.getFamily() + " " + os.getVersionInfo().getVersion();
        } catch (RuntimeException | LinkageError e) {
            log.debug("OS info read failed", e);
        }

        return new HostSnapshot(
            cpuPercent, memUsed, memTotal, memPercent,
            diskUsed, diskTotal, diskPercent,
            inKbps, outKbps, uptime, cores, osDescription);
    }

    /** JVM heap usage from the JDK MX bean — independent of OSHI. */
    public double[] jvmHeap() {
        var heap = ManagementFactory.getMemoryMXBean().getHeapMemoryUsage();
        double used = heap.getUsed();
        double max = heap.getMax() > 0 ? heap.getMax() : heap.getCommitted();
        double percent = max > 0 ? round(used / max * 100.0) : 0;
        return new double[] {used, max, percent};
    }

    private long[] totalNetworkBytes() {
        long recv = 0;
        long sent = 0;
        List<NetworkIF> interfaces = hardware.getNetworkIFs();
        for (NetworkIF net : interfaces) {
            recv += net.getBytesRecv();
            sent += net.getBytesSent();
        }
        return new long[] {recv, sent};
    }

    private OSFileStore primaryFileStore() {
        OSFileStore best = null;
        for (OSFileStore store : os.getFileSystem().getFileStores()) {
            if ("/".equals(store.getMount())) {
                return store;
            }
            if (best == null || store.getTotalSpace() > best.getTotalSpace()) {
                best = store;
            }
        }
        return best;
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
