import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import NavbarToggleButton from '/components/navbar-toggle';

const NavItemClass = 'relative pl-12 pr-16 py-3 flex space-x-4 items-center cursor-pointer hover:bg-gray-500/10';

/**
 * the navbar is placed on the left (side-by-side) to the page conents
 * typically this can be done using flex via making this component
 * of a child element that is using display: flex;
 * 
 * @param {*} menu item list of pages
 */
export default function Navbar() {
    const [display, setDisplay] = useState([]);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_STREAM_SERVER}/navbar`, {
            method: 'POST',
            cache: 'no-cache',
            'headers': {
                'Content-Type': 'application/json'
            },
        })
            .then(r => r.json())
            .then(r => {
                let a = [];
                for (let i = 0; i < r.length; i++) {
                    let slug = r[i][0];
                    let displayName = r[i][1];
                    a.push(
                        <Link key={slug} href={`/browse/${slug}`}>
                            <div key={slug} className={NavItemClass}>
                                <i className="py-2 fa-regular fa-clone"></i>
                                <a className="stretched-link">{displayName}</a>
                            </div>
                        </Link>
                    );
                }
                setDisplay(a);
            })
            .catch(e => {
                console.error(`[navbar.js] Failed to retrieve navbar menu items`, e)
            });
    }, []);

    return (
        <div id="navbar" className="z-50 xl:z-40 shadow-xl h-screen bg-zinc-900 transition-all fixed top-0 xl:sticky xl:top-16">
            <NavbarToggleButton className="xl:hidden" />

            <div id="navbar-menu" className="flex flex-col whitespace-nowrap max-h-screen pb-24 overflow-y-auto" >
                <Link href={`/`}>
                    <div className={NavItemClass}>
                        <i className="py-2 fa-solid fa-house"></i>
                        <a className="stretched-link">Home</a>
                    </div>
                </Link>

                {display}
            </div>
        </div>
    )
}