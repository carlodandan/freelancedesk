pub mod migrations;

use rusqlite::{Connection, Result};
use std::path::Path;

pub fn init_database(db_path: &Path) -> Result<Connection> {
    let mut conn = Connection::open(db_path)?;
    migrations::run_migrations(&mut conn)?;
    Ok(conn)
}
