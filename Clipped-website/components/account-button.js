import { useEffect, useState } from 'react';
import * as User from '/lib/models/user';
import Link from 'next/link';

export default function AccountButton() {
    const [e, set] = useState();
    useEffect(() => {
        // client sided verification
        const cookie = document.cookie.split(';')[0].split('=')[1];
        const user = User.fromCookie(cookie);

        set(user ?
            <Link href={`${`/profile`}`}>
                <button className="mr-4 flex items-center space-x-2 p-3">
                    <i className="fa-solid fa-user"></i>
                    <span>Account</span>
                </button>
            </Link>
            :
            <Link href="/login">
                <button className="mr-4 flex items-center space-x-2 p-3">
                    <i className="fa-solid fa-door-closed"></i>
                    <span>Login</span>
                </button>
            </Link>
        );
    }, []);

    return (<>{e}</>);
}