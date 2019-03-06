const config = require('./config/config.json');
const fs = require('fs');
const path = require('path');
const request = require('sync-request');

const mapData = fs.existsSync('./storage/beatmap-data.json') ? require('./storage/beatmap-data.json') : {};
const userData = fs.existsSync('./storage/user-data.json') ? require('./storage/user-data.json') : {};

function osuApiRequestSync(endpoint, params) {
    let url = `https://osu.ppy.sh/api/${endpoint}?k=${config.osuApiKey}`;

    Object.keys(params).forEach(function (key) {
        url += `&${key}=${params[key]}`;
    });

    const response = request('GET', url);

    if (response.statusCode === 401)
        throw 'Invalid osu!api key';

    return JSON.parse(response.getBody());
}

function getUserData(userId, byName = false) {
    if (!userData[userId]) {
        console.log(`Making API request to get_user for ${userId}`);

        const data = osuApiRequestSync('get_user', {
            type: byName ? 'string' : 'id',
            u: userId
        });

        if (!data.length)
            throw `User not found: ${userId}`;

        userData[data[0].user_id] = data[0];
        userData[data[0].username] = data[0].user_id;
        fs.writeFileSync('./storage/user-data.json', JSON.stringify(userData, null, 4));
    }

    return byName ? userData[userData[userId]] : userData[userId];
}

function getMapData(mapId) {
    if (!mapData[mapId]) {
        console.log(`Making API request to get_beatmaps for ${mapId}`);

        const data = osuApiRequestSync('get_beatmaps', {
            b: mapId
        });

        if (!data.length)
            throw `Beatmap not found: ${mapId}`;

        mapData[mapId] = data[0];
        fs.writeFileSync('./storage/beatmap-data.json', JSON.stringify(mapData, null, 4));
    }

    return mapData[mapId];
}

function getUserLink(userId, byName = false) {
    const user = getUserData(userId, byName);

    return `https://osu.ppy.sh/users/${user.user_id}`;
}

function getMapLink(mapId) {
    const map = getMapData(mapId);
    const mode = ['osu', 'taiko', 'fruits', 'mania'][map.mode];

    return `https://osu.ppy.sh/beatmapsets/${map.beatmapset_id}#${mode}/${map.beatmap_id}`;
}

function escapeMarkdown(text) {
    return text.replace(/([_\*\[\]~\\])/g, '\\$1');
}

exports.joinList = function (array) {
    if (array.length === 0)
        throw 'Invalid array';

    let line = array[0];

    for (let i = 1; i < array.length; i++)
        if (i === array.length - 1)
            if (array[i].includes('et al.'))
                line += ' et al.';
            else
                line += ` and ${array[i]}`;
        else
            line += `, ${array[i]}`;

    return line;
}

exports.fullModeName = function (mode) {
    switch (mode) {
        case 'osu':
            return 'osu!';
        case 'taiko':
            return 'osu!taiko';
        case 'catch':
            return 'osu!catch';
        case 'mania':
            return 'osu!mania';
    }
}

exports.fixCommonMistakes = function (text) {
    return text
        // newlines
        .replace(/\\n/g, '\n')
        // "smart" characters
        .replace(/[‘’]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/…/g, '...')
        .replace(/½/g, '1/2')
        .replace(/⅓/g, '1/3')
        .replace(/¼/g, '1/4')
        .replace(/⅙/g, '1/6')
        .replace(/⅛/g, '1/8')
        // acronym consistency
        .replace(/(\d+) ?k(?<=\s)/gi, '$1K')
        .replace(/(\d+) ?bpm/gi, '$1 BPM');
}

exports.osuModernLinks = function (text) {
    return text
        .replace(/https\:\/\/osu.ppy.sh\/s\//g, 'https://osu.ppy.sh/beatmapsets/')
        .replace(/https\:\/\/osu.ppy.sh\/u\/([0-9]+)/g, 'https://osu.ppy.sh/users/$1')
        .replace(/https\:\/\/osu.ppy.sh\/u\/([0-9A-Za-z-_%\[\]]+)/g, (_, userId) => getUserLink(userId, true))
        .replace(/https\:\/\/osu.ppy.sh\/b\/([0-9]+)/g, (_, mapId) => getMapLink(mapId))
        .replace(/https\:\/\/osu.ppy.sh\/forum\/t\//g, 'https://osu.ppy.sh/community/forums/topics/');
}

exports.mkdirTreeSync = function mkdirTreeSync(dir) {
    if (fs.existsSync(dir))
        return;

    try {
        fs.mkdirSync(dir);
    } catch (error) {
        if (error.code === 'ENOENT') {
            mkdirTreeSync(path.dirname(dir));
            mkdirTreeSync(dir);
        } else
            throw error;
    }
}

exports.textFromTemplate = function (template, vars = {}) {
    return template
        .replace(/<\?(.+?)\?>/gs, function (_, script) {
            const result = eval(script);

            return result === undefined || result === null ? '' : result;
        })
        .trim();
}

exports.getUserMd = function (userId, byName = false) {
    const user = getUserData(userId, byName);

    return `[${escapeMarkdown(user.username)}](${getUserLink(user.user_id)})`;
}

exports.getMapMd = function (mapId) {
    const map = getMapData(mapId);

    return `[${escapeMarkdown(map.title)} [${escapeMarkdown(map.version)}]](${getMapLink(map.beatmap_id)})`;
}

exports.getMapStatus = function (mapId) {
    const map = getMapData(mapId);

    return ['Unranked', 'Ranked', 'Approved', 'Qualified', 'Loved'][Math.max(0, map.approved)];
}
