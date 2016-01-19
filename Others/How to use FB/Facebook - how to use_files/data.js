define(function(){
    return {
        phones: [
            {
                title   : "iPhone",
                slug    : 'iphone',
                app_url : 'http://itunes.apple.com/us/app/google-authenticator/id388497605?mt=8'
            },
            {
                title   : 'Android',
                slug    : 'android',
                app_url : 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2'
            },
            {
                title   : 'BlackBerry',
                slug    : 'blackberry',
                app_url : 'm.google.com/authenticator'
            }
        ],
        api_url: '/vbdev/login_api.php', // /vbdev/login_api.php
    }
})