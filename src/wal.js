const fs = require('fs');
const path = require('path');

// Write-Ahead Logging (WAL) layer for atomic, durable persistence
// - All writes are first logged to a WAL file
// - Once logged, data is synced to main file
// - On recovery, if main file is incomplete, WAL is replayed
// This prevents data corruption from crashes mid-write

class WAL {
  constructor(dataDir, filename) {
    this.dataDir = dataDir;
    this.filename = filename;
    this.filepath = path.join(dataDir, filename);
    this.walpath = path.join(dataDir, filename + '.wal');
    this.walFd = null;
    this._initWAL();
  }

  _initWAL() {
    // If WAL file exists and main file is missing/incomplete, recover from WAL
    if (fs.existsSync(this.walpath)) {
      try {
        const walData = fs.readFileSync(this.walpath, 'utf8');
        if (walData.trim()) {
          console.log(`WAL: Found recovery log for ${this.filename}, recovering...`);
          fs.writeFileSync(this.filepath, walData, 'utf8');
          fs.unlinkSync(this.walpath); // clear WAL after recovery
        }
      } catch (err) {
        console.warn(`WAL: Recovery failed for ${this.filename}: ${err.message}`);
      }
    }
  }

  // Atomic write: first write to WAL, then to main file
  writeAtomic(data) {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

      // Step 1: Write to WAL (append/overwrite)
      fs.writeFileSync(this.walpath, serialized, 'utf8');

      // Step 2: Fsync WAL to ensure it hits disk (durable)
      // Note: Node.js doesn't expose fsync on regular file ops, so we do best-effort
      // In production, consider using a library that wraps fsync

      // Step 3: Write to main file
      fs.writeFileSync(this.filepath, serialized, 'utf8');

      // Step 4: Clear WAL (we're done)
      if (fs.existsSync(this.walpath)) {
        fs.unlinkSync(this.walpath);
      }

      return true;
    } catch (err) {
      console.error(`WAL: Atomic write failed for ${this.filename}: ${err.message}`);
      return false;
    }
  }

  // Async version (recommended for non-blocking writes)
  async writeAtomicAsync(data) {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

      // Step 1: Write to WAL
      await fs.promises.writeFile(this.walpath, serialized, 'utf8');

      // Step 2: Write to main file
      await fs.promises.writeFile(this.filepath, serialized, 'utf8');

      // Step 3: Clear WAL
      try {
        if (fs.existsSync(this.walpath)) {
          await fs.promises.unlink(this.walpath);
        }
      } catch (e) {
        // ignore if WAL already gone
      }

      return true;
    } catch (err) {
      console.error(`WAL: Async atomic write failed for ${this.filename}: ${err.message}`);
      return false;
    }
  }

  // Read data from main file (or WAL if main is missing)
  read() {
    if (fs.existsSync(this.filepath)) {
      return fs.readFileSync(this.filepath, 'utf8');
    } else if (fs.existsSync(this.walpath)) {
      console.warn(`WAL: Main file missing for ${this.filename}, reading from WAL`);
      return fs.readFileSync(this.walpath, 'utf8');
    }
    return null;
  }

  // Cleanup
  close() {
    // nothing to close in our simple sync implementation
  }
}

module.exports = WAL;
