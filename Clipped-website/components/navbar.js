import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import NavbarToggleButton from '/components/navbar-toggle';
import Avatar from '/components/avatar';

const NavItemClass = 'relative pl-12 pr-16 py-3 flex space-x-4 items-center cursor-pointer hover:bg-gray-500/10';

/**
 * the navbar is placed on the left (side-by-side) to the page conents
 * typically this can be done using flex via making this component
 * of a child element that is using display: flex;
 * 
 * @param {*} menu item list of pages
 */
export default function Navbar({ proc }) {
    const [serverMenu, setServerMenu] = useState([]);
    const [friendsMenu, setFriendsMenu] = useState([]);

    useEffect(() => {
        const importServerMenu = () => {
            fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/navbar`, {
                method: 'POST',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json'
                },
            })
                .then(res => res.json())
                .then((res) => {
                    let a = [];
                    // console.log('server navbar', res);
                    setServerMenu(a);
                })
                .catch(e => {
                    console.error(`[navbar.js] Failed to retrieve navbar menu items`, e)
                });
        };
        const importFriendsMenu = () => {
            if (localStorage.friends) {
                let friends = JSON.parse(localStorage.friends);
                let a = [];
                for (let i = 0; i < friends.length; i++) {
                    let friend = friends[i];
                    a.push(
                        <Link key={friend.ID} href={`/profile/${friend.ID}`}>
                            <div className={NavItemClass}>
                                <Avatar user={friend.ID} className="py-2 w-8" />
                                <a className="stretched-link">{friend.displayName}</a>
                            </div>
                        </Link>
                    );
                }
                setFriendsMenu(a);
            }
        };

        importServerMenu();
        importFriendsMenu();
    }, [proc]);

    return (
        <div id="navbar" className="z-50 xl:z-40 shadow-xl h-screen bg-zinc-900 transition-all fixed top-0 xl:sticky xl:top-16">
            <NavbarToggleButton className="xl:hidden" />

            <div id="navbar-menu" className="flex flex-col whitespace-nowrap max-h-screen pb-24 overflow-y-auto" >
                <Link href={`/`}>
                    <div className={NavItemClass}>
                        <i className="px-2 py-2 fa-solid fa-house"></i>
                        <a className="stretched-link">Home</a>
                    </div>
                </Link>

                {serverMenu}
                {friendsMenu}
            </div>
        </div>
    )
}