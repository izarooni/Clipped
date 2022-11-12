export function getDays(n) {
    return (Math.floor(parseInt(n) / (1000 * 60 * 60 * 24) )).toFixed(0);
}

export function getHours(n) {
    return (Math.floor(parseInt(n) / (1000 * 60 * 60) % 24)).toFixed(0);
}

export function getMinutes(n) {
    return (Math.floor(parseInt(n) / (1000 * 60) % 60)).toFixed(0);
}

export function getSeconds(n) {
    return (Math.floor(parseInt(n) / (1000) % 60)).toFixed(0);
}

export function toString(n) {

    // just return the year month date
    if (this.getDays(n) > 21) return new Date(Date.now() - n).toString().substring(4, 15);
    else if (this.getDays(n) > 7) {

        // weeks ago
        let v = Math.floor(this.getDays(n) / 7);
        return `${v} week${v == 1 ? '' : 's'} ago`;

    } else if (this.getDays(n) > 0) {

        // days ago
        let v = this.getDays(n);
        return `${v} day${v == 1 ? '' : 's'} ago`;

    } else if (this.getHours(n) > 0) {

        // hours
        let v = this.getHours(n);
        return `${v} hour${v == 1 ? '' : 's'} ago`;

    } else if (this.getMinutes(n) > 0) {

        // minutes
        let v = this.getMinutes(n);
        return `${v} minute${v == 1 ? '' : 's'} ago`;

    } else return 'Moments ago';
}