use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "schema",
            sql: include_str!("../migrations/001_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_geography",
            sql: include_str!("../migrations/002_seed_geography.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "seed_lookups",
            sql: include_str!("../migrations/003_seed_lookups.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "seed_local_levels",
            sql: include_str!("../migrations/004_seed_local_levels.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "notification_dedupe",
            sql: include_str!("../migrations/005_notification_dedupe.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "builtin_flag",
            sql: include_str!("../migrations/006_builtin_flag.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:hisabdesk.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running HisabDesk");
}
