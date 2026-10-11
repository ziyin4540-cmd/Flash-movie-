// YouTube / Drive Embedded Controls Logic
function renderCustomVideoPlayer(videoData) {
    if (videoData.media_type === 'youtube_video' || (videoData.media_url && videoData.media_url.includes('youtube.com'))) {
        let ytId = videoData.media_url.includes('youtu.be/') ? videoData.media_url.split('youtu.be/')[1].split('?')[0] : videoData.media_url.split('v=')[1].split('&')[0];
        return `<div style="width:100%; height:250px; background:#000;"><iframe src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1" width="100%" height="100%" frameborder="0" allow="autoplay" allowfullscreen></iframe></div>`;
    } else if (videoData.media_type === 'gdrive_video' || (videoData.media_url && videoData.media_url.includes('drive.google.com'))) {
        let fileId = videoData.media_url.includes('/file/d/') ? videoData.media_url.split('/file/d/')[1].split('/')[0] : videoData.media_url.split('id=')[1].split('&')[0];
        let embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        return `<div style="width:100%; height:240px; background:#000; overflow:hidden;"><iframe src="${embedUrl}" width="100%" height="320px" frameborder="0" allow="autoplay" style="border:none; margin-top:-50px;"></iframe></div>`;
    } else {
        return `<video src="${videoData.media_url}" controls autoplay width="100%" style="background:#000; max-height:250px;"></video>`;
    }
}
