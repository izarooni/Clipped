import * as User from '/lib/models/user';

export default function () {
    // nothing needed here
}

export async function getServerSideProps({ req, res }) {
    const redirect = (path) => { return { redirect: { permanent: false, destination: path } } }

    let localUser = User.fromCookie(req.cookies.user);
    const local = !localUser ? null : await User.getUser(localUser.ID);

    if (!local || local && local.error) return redirect('/logout');
    else if (local && local.username) return redirect(`/profile/${local.username}`);

    return { props: {} };
};
