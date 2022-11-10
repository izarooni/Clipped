export default function VideoFeed({ videos, className }) {
    className ||= '';

    return (
        <div className={`grid gap-4 ${className}`}>
            {videos}
        </div>
    );
}