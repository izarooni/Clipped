export default function Alert({ type, className, message, dismiss }) {
    if (!dismiss) dismiss = (e) => e.target.parentElement.classList.add('hidden');

    let theme = 'bg-red-800/80';
    switch (type) {
        case 'success':
            theme = 'bg-green-800/80';
            break;
    }

    return (
        <div className={`z-40 rounded transition-all shadow-xl backdrop-blur
            ${theme}
            ${className} 
            ${message ? '' : 'hidden'}`}
        >
            <div className="relative text-center">
                <i onClick={dismiss}
                    className="fa-solid fa-circle-xmark 
                    absolute right-2 top-2
                    cursor-pointer 
                    transition-all"></i>
                <p className={`text-white/80 font-mono text-sm px-24 py-8`}>{message}</p>
            </div>
        </div>
    )
}