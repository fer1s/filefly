fn bytes_to_gb(bytes: &u64) -> u16 {
    (bytes / (1e+9 as u64)) as u16
}

fn bytes_to_mb(bytes: &u64) -> u16 {
    (bytes / (1e+6 as u64)) as u16
}

pub fn format_bytes(bytes: &u64) -> String {
    let gb = bytes_to_gb(&bytes);
    let mb = bytes_to_mb(&bytes);
    match gb {
        0 => format!("{} MB", mb),
        _ => format!("{} GB", gb),
    }
}