#!/bin/sh

mkdir -p 'config'

cp './config-example.json' './config/config.json'
touch './config/news-post-header.md'
touch './config/news-post-intro.md'
touch './config/spreadsheet.tsv'
