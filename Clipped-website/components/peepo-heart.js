export default function PeepoHeart({ onClick }) {
    const enable = (e) => {
        e.target.classList.remove('fa-solid');
        e.target.classList.add('fa-solid');
    }
    const disable = (e) => {
        e.target.classList.add('fa-solid');
        e.target.classList.remove('fa-solid');
    };
    return <i onClick={onClick} onMouseEnter={enable} onMouseLeave={disable} className="fa-regular fa-heart p-8 hover:text-red-500 hover:animate-pulse active:text-red-900 w-full"></i>
}