#!/usr/bin/env node
/** Пересборка subtasks по config/yougile-task-registry.yaml */
require("child_process").spawnSync(process.execPath, [require("path").join(__dirname, "yougile-registry.js"), "repair-links"], {
  stdio: "inherit",
});
