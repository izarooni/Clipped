export function getDays(ms) {
    return Math.floor(getHours(ms) / 24);
}

export function getHours(ms) {
    return Math.floor(getMinutes(ms) / 60);
}

export function getMinutes(ms) {
    return Math.floor(getSeconds(ms) / 60);
}

export function getSeconds(ms) {
    return Math.floor(ms / 1000);
}

export function toString(t) {
    let offset = new Date().getTimezoneOffset() * 60 * 1000;
    let ms = Date.now() - (t + offset);

    // just return the year month date
    if (this.getDays(ms) > 21) {

        let d = new Date(ms);
        let year = d.getUTCFullYear(); let month = [
            "Jan", "Feb", "March", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"
        ][d.getUTCMonth()];
        let day = d.getUTCDate(); let hr = d.getUTCHours();
        let min = d.getUTCMinutes(); let sec = d.getUTCSeconds();

        return `${month} ${day} ${year}`;
    } else if (this.getDays(ms) > 7) {

        // weeks ago
        let v = Math.floor(this.getDays(ms) / 7);
        return `${v} week${v == 1 ? '' : 's'} ago`;

    } else if (this.getDays(ms) > 0) {

        // days ago
        let v = this.getDays(ms);
        return `${v} day${v == 1 ? '' : 's'} ago`;

    } else if (this.getHours(ms) > 0) {

        // hours
        let v = this.getHours(ms);
        return `${v} hour${v == 1 ? '' : 's'} ago`;

    } else if (this.getMinutes(ms) > 0) {

        // minutes
        let v = this.getMinutes(ms);
        return `${v} minute${v == 1 ? '' : 's'} ago`;

    } else if (this.getSeconds(ms) > 0) {

        // seconds
        let v = this.getSeconds(ms);
        return `${v} second${v == 1 ? '' : 's'} ago`;

    } else return 'Moments ago';
}