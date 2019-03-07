const config = require('./config/config.json');
const dateFormat = require('dateformat');
const fs = require('fs');
const helpers = require('./helpers.js');
const path = require('path');

const MODES = ['osu', 'taiko', 'catch', 'mania'];
const banners = fs.readdirSync('./config')
    .filter(i => fs.statSync(path.join('./config', i)).isFile()
            && (path.extname(i).match(/\.?(png|jpg|jpeg)/) !== null));
const banner = banners.find(i => !i.includes('@2x'));
const bannerLarge = banners.find(i => i.includes('@2x'));
const newsFolder = `${config.date}-${config.title.toLowerCase().replace(/\W+/g, '-')}`;
const newsPostTemplate = fs.readFileSync('./news-post-template.md', 'utf8');
const newsPostTemplateScore = fs.readFileSync('./news-post-template-score.md', 'utf8');
const scoreSections = {};
const spreadsheet = fs.readFileSync('./config/spreadsheet.tsv', 'utf8')
    .trim()
    .split('\n')
    .map(row => row.split('\t'));

helpers.mkdirTreeSync('./output/news');
helpers.mkdirTreeSync(`./output/wiki/shared/news/${newsFolder}`);
helpers.mkdirTreeSync(`./temp/${newsFolder}`);

if (banner !== undefined && bannerLarge !== undefined) {
    fs.copyFileSync(path.join('./config', banner), `./temp/${newsFolder}/banner.jpg`);
    fs.copyFileSync(path.join('./config', bannerLarge), `./temp/${newsFolder}/banner@2x.jpg`);
}

for (let mode of MODES) {
    const scores = [];

    const spreadsheetForMode = spreadsheet
        .filter(s => s[2] === helpers.fullModeName(mode))
        .sort((a, b) => a[3] - b[3])
        .sort((a, b) => a[6].localeCompare(b[6]));

    for (let score of spreadsheetForMode) {
        let scoreInfo = `**${helpers.getUserMd(score[4])}**: ${helpers.getMapMd(score[3])}`;

        if (score[11] !== 'None')
            scoreInfo += ` +${score[11]}`;

        scoreInfo += ` **${score[7]}**`;

        if (score[7] !== 'SS' && score[7] !== 'Silver SS')
            scoreInfo += ` (${score[8]}, ${score[9]})`;
        else if (score[2] === 'osu!mania')
            scoreInfo += ` (${score[8]})`;

        scoreInfo += `  \n${dateFormat(score[6], 'd mmmm yyyy', true)}, ${helpers.getMapStatus(score[3])}`;

        if (score[10] !== '0')
            scoreInfo += `, ${score[10]}pp`;

        scoreInfo += '  \n*';

        if (score[15] === 'No description')
            scoreInfo += `Added by ${helpers.getUserMd(score[12], true)}`;
        else
            if (score[12] === score[13])
                scoreInfo += `Added and written by ${helpers.getUserMd(score[12], true)}`;
            else
                scoreInfo += `Added by ${helpers.getUserMd(score[12], true)}, written by ${helpers.getUserMd(score[13], true)}`;

        scoreInfo += '*';

        scores.push(helpers.textFromTemplate(newsPostTemplateScore, {
            VIDEO: score[5],
            SCORE_INFO: scoreInfo,
            DESCRIPTION: score[15] === 'No description' ? null : helpers.fixCommonMistakes(helpers.osuModernLinks(score[15]))
        }));
    }

    scoreSections[mode] = scores.join('\n\n');
}

fs.writeFileSync(`./output/news/${newsFolder}.md`, helpers.textFromTemplate(newsPostTemplate, {
    TITLE: config.title,
    DATE: config.date,
    TIME: config.time,
    HEADER: helpers.textFromTemplate(fs.readFileSync('./config/news-post-header.md', 'utf8')),
    DIRECTORY: newsFolder,
    INTRO: helpers.textFromTemplate(fs.readFileSync('./config/news-post-intro.md', 'utf8')),
    SCORES: scoreSections
}) + '\n');
