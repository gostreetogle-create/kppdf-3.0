#!/usr/bin/env node
/** Лаунчеры для опечаток start.ps1 + c / start.ps1 + кирилл. с */
const fs = require("fs");
const path = require("path");

const root = __dirname.replace(/tools$/, "").replace(/tools\\$/, "");
const ps1Body =
  "& (Join-Path $PSScriptRoot 'start.ps1') @args\r\n";

const variants = [
  "start.ps1c.ps1", // латинская c
  "start.ps1\u0441.ps1", // кириллическая с U+0441
];

for (const name of variants) {
  fs.writeFileSync(path.join(root, name), ps1Body, "utf8");
  console.log("Created:", name);
}

// cmd для PowerShell: cmd /c start.ps1с (имя без .ps1)
const cmdBody =
  "@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File \"%~dp0start.ps1\" %*\r\n";
fs.writeFileSync(path.join(root, "start.ps1\u0441"), cmdBody, "utf8");
fs.writeFileSync(path.join(root, "start.ps1c"), cmdBody, "utf8");
console.log("Created: start.ps1с, start.ps1c (cmd, use: cmd /c .\\start.ps1с)");
