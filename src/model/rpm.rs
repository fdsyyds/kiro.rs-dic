//! Lightweight per-minute request tracking for credential pool scheduling.

use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::time::{Duration, Instant};

const WINDOW_SECS: u64 = 60;

struct TimestampQueue {
    timestamps: Vec<Instant>,
}

impl TimestampQueue {
    fn new() -> Self {
        Self {
            timestamps: Vec::new(),
        }
    }

    fn record(&mut self, now: Instant) {
        self.timestamps.push(now);
    }

    fn count(&mut self, now: Instant) -> u64 {
        let cutoff = now - Duration::from_secs(WINDOW_SECS);
        let pos = self.timestamps.partition_point(|t| *t < cutoff);
        if pos > 0 {
            self.timestamps.drain(..pos);
        }
        self.timestamps.len() as u64
    }
}

pub struct RpmTracker {
    inner: Mutex<RpmTrackerInner>,
}

struct RpmTrackerInner {
    global: TimestampQueue,
    by_credential: HashMap<u64, TimestampQueue>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RpmSnapshot {
    pub global: u64,
    pub by_credential: HashMap<u64, u64>,
}

impl RpmTracker {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(RpmTrackerInner {
                global: TimestampQueue::new(),
                by_credential: HashMap::new(),
            }),
        }
    }

    pub fn record_credential(&self, credential_id: u64) {
        let now = Instant::now();
        let mut inner = self.inner.lock();
        inner.global.record(now);
        inner
            .by_credential
            .entry(credential_id)
            .or_insert_with(TimestampQueue::new)
            .record(now);
    }

    pub fn get_credential_rpm(&self, credential_id: u64) -> u64 {
        let now = Instant::now();
        let mut inner = self.inner.lock();
        inner
            .by_credential
            .get_mut(&credential_id)
            .map(|q| q.count(now))
            .unwrap_or(0)
    }

    pub fn snapshot(&self) -> RpmSnapshot {
        let now = Instant::now();
        let mut inner = self.inner.lock();
        let global = inner.global.count(now);
        let by_credential = inner
            .by_credential
            .iter_mut()
            .map(|(&id, queue)| (id, queue.count(now)))
            .filter(|(_, count)| *count > 0)
            .collect();

        RpmSnapshot {
            global,
            by_credential,
        }
    }
}

