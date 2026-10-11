// Followers, Following & Total Likes Calculator Logic
async function getUserFollowStats(username) {
    try {
        const { data: followers } = await supabaseClient.from('flash_follows').select('*').eq('following_id', username);
        const { data: following } = await supabaseClient.from('flash_follows').select('*').eq('follower_id', username);
        
        return {
            followerCount: followers ? followers.length : 0,
            followingCount: following ? following.length : 0
        };
    } catch(e) {
        return { followerCount: 0, followingCount: 0 };
    }
}

