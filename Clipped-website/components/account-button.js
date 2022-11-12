import { useEffect, useState } from 'react';
import * as User from '/lib/models/user';
import Link from 'next/link';

export default function AccountButton() {
    const [e, set] = useState();
    useEffect(() => {
        // client sided verification
        const cookie = document.cookie.split(';')[0].split('=')[1];
        const user = User.fromCookie(cookie);

        // only show the button if the user cookie exists
        set(user ?
            <Link href={`${`/profile`}`}>
                <button className="mr-4 flex items-center space-x-2 p-3">
                    <i className="fa-solid fa-user"></i>
                    <span className="hidden sm:inline">Account</span>
                </button>
            </Link>
            :
            <Link href="/login">
                <button className="mr-4 flex items-center space-x-2 p-3">
                    <i className="fa-solid fa-door-closed"></i>
                    <span className="hidden sm:inline">Login</span>
                </button>
            </Link>
        );
    }, []);

    return (<>{e}</>);
}