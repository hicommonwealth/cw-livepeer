import Promise from 'bluebird';
import fs from 'fs';

export const readFile = (path, opts = 'utf8') =>
    new Promise((res, rej) => {
        fs.readFile(path, opts, (err, data) => {
            if (err) rej(err);
            else res(data);
        });
    });

export const writeFile = (path, data, opts = 'utf8') =>
    new Promise((res, rej) => {
        fs.writeFile(path, data, opts, (err) => {
            if (err) rej(err);
            else res();
        });
    });

export const fileExists = (path) => fs.existsSync(path);