import { useEffect } from 'react';

export default function Logout() {
    useEffect(() => {
        document.cookie = 'user=;Max-Age=0'
        delete localStorage.friends;

        window.location = '/'
    }, []);

    return '';
}