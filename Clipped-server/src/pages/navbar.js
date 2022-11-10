import { getConnection } from '../database.js';

var MenuCache;
var LastUpdated;

function Navbar(req, res) {
    if (MenuCache && Date.now() - LastUpdated < 1000 * 60 * 60 * 24) {
        res.write(MenuCache);
        res.end();
        return;
    }

    getConnection().then((session) => {
        session.sql('select slug, display_name from navbar').execute().then((rs) => {
            MenuCache = JSON.stringify(rs.fetchAll());
            LastUpdated = Date.now();

            res.writeHead(200, { 'Content-Type': 'text/json' });
            res.write(MenuCache);

            session.close();
            res.end();
        });
    });
}

export default Navbar;