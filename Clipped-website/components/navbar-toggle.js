import React, { useEffect } from 'react'
import Link from 'next/link'

export default function NavbarToggleButton({ className }) {
    const websiteName = process.env.NEXT_PUBLIC_WEBSITE_NAME;

    // use interaction; update ux
    const onButtonClick = (e) => updateNavbar(true);

    useEffect(() => {
        // window resizes don't cause ux updates
        window.onresize = (e) => updateNavbar(false);

        // single-use useEffect, cause ux update to initialize state
        updateNavbar(true);
    }, []);

    // update on re-renders but don't update ux
    useEffect(() => updateNavbar(false));

    /* manipulate as per tailwindcss documentation:
    sm	640px
    md	768px
    lg	1024px
    xl	1280px - current
    2xl	1536px 
    */
    const updateNavbar = function (updateUX) {
        const navbar = document.querySelector('#navbar');
        if (!navbar) return;

        const winWidth = window.innerWidth;
        const xl = winWidth >= 1280;
        // update localStorage for ux state
        let localHidden = localStorage.navbarHidden == 'true';
        if (updateUX) localStorage.navbarHidden = (localHidden = !localHidden);

        if (xl) {
            // always display on page on xl+ screens
            navbar.classList.remove('-translate-x-full');
            if (updateUX || localHidden) {
                const origin = ['pl-12', 'pr-16'], reduce = ['p-8'];

                document.querySelectorAll('#navbar-menu > div').forEach(e => {
                    // reduce padding (show icons only)
                    if (localHidden) {
                        e.classList.remove(...origin);
                        e.classList.add(...reduce);
                    } else {
                        // increase padding (expand horizontally)
                        e.classList.add(...origin);
                        e.classList.remove(...reduce);
                    }
                });

                document.querySelectorAll('#navbar-menu a').forEach(e => {
                    // hide text (show icons only)
                    if (localHidden) e.classList.add('hidden');
                    // show text
                    else e.classList.remove('hidden');
                });
            }
        } else {
            // always display text on smaller screens
            document.querySelectorAll('#navbar-menu a').forEach(e => e.classList.remove('hidden'));

            // reset padding
            const origin = ['pl-12', 'pr-16'], reduce = ['p-8'];
            document.querySelectorAll('#navbar-menu > div').forEach(e => {
                e.classList.remove(...reduce);
                e.classList.add(...origin);
            });

            // off-canvas navbar on smaller screens
            localHidden
                ? navbar.classList.add('-translate-x-full')
                : navbar.classList.remove('-translate-x-full');

            // remove animation when going from larger to smaller screen size
            if (!updateUX && localHidden) navbar.classList.remove('transition-all');
            else navbar.classList.add('transition-all');
        }
    };

    return (
        <div className={`flex items-center ${className}`}>
            <div onClick={onButtonClick} className="cursor-pointer relative p-3 flex items-center justify-center">
                <i className="fa-solid fa-clapperboard rounded-full p-4 active:bg-gray-500/10"></i>
            </div>

            <Link href={'/'}>
                <a className="text-3xl font-bold font-mono px-4">{websiteName}</a>
            </Link>
        </div>
    )
}
