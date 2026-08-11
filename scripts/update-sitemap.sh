#!/bin/bash
# Netlify build script: stamps deploy date into sitemap.xml
# Runs on every deploy via: netlify.toml [build] command = "bash scripts/update-sitemap.sh"

DATE=$(date +%Y-%m-%d)
sed -i "s/<lastmod>[0-9-]*<\/lastmod>/<lastmod>$DATE<\/lastmod>/" sitemap.xml
echo "Sitemap lastmod updated to $DATE"
