import { getConnection } from '../database.js';
import { error } from '../utils.js';


export default function Navbar(req, res) {
    getConnection().then(async (session) => {
        let rs = await session.sql('select slug, display_name from navbar').execute();
        let rows = rs.fetchAll();
        if (!rows) {
            session.close();
            return error(res, '');
        }

        session.close();
        res.writeHead(200, { 'Content-Type': 'text/json' });
        res.end(JSON.stringify(rows));
    });
}