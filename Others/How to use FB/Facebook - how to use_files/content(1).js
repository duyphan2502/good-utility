define({
    validation              : {
        require_captcha     : 'Vì lý do bảo mật tài khoản, vui lòng nhập mã bảo mật để tiếp tục.',
        require_phone       : "Hãy chọn một loại điện thoại",
        invalid_authentication: 'Sai username hoặc passwword',
        incorrect_captcha   : 'Sai mã bảo mật',
        require_2factor     : 'Hãy nhập mã xác nhận được tạo bởi ứng dụng di động trên điện thoại của bạn.',
        incorrect_2factor   : 'Mã bảo mật không chính xác',
        badpassword         : 'Password của bạn quá dễ đoán',
        passwordmismatch    : 'Password xác nhận không khớp',
        passwordhistory     : 'Password mới của bạn giống một password cũ, hãy chọn password khác',
        already_used        : 'Tính năng bảo mật 2FA hiện đã được kích hoạt cho tài khoản của bạn.',
        require_changepass  : 'Bạn cần phải đổi password trước khi kích hoạt tính năng bảo mật.',
    },
    message                 : {
        twoFA_enable        : 'Tính năng bảo mật 2FA đã được kích hoạt',
        twoFA_disable       : 'Tính năng bảo mật 2FA đã được tắt',
        choose_phone_top    : 'Chúng tôi chỉ hỗ trợ một điện thoại duy nhất sử dụng để tạo mã xác nhận, vui lòng chọn loại điện thoại bạn đang sử dụng:',
        choose_phone_bottom : 'Sau khi bạn hoàn thành bước này, <strong>mã xác nhận tạo ra bởi phần mềm Authenticator trên điện thoại cũ của bạn sẽ không còn tác dụng</strong>.'
    },
    box_title               : {
        login               : 'Đăng nhập',
        captcha             : 'Mã bảo mật',
        twoFA               : '2FA - Bảo mật tài khoản diễn đàn với 2 bước xác nhận',
        lost_password       : 'Quên mật khẩu'
    },
    button                  : {
        twoFA_trigger       : '[Bảo mật 2FA]',
        twoFA_disable       : 'Tắt tính năng bảo mật 2FA',
        sign_in             : 'Đăng nhập',
        prev                : 'Quay lại',
        verify              : 'Xác nhận',
        verify_and_save     : 'Kích hoạt điện thoại mới',
        move_phone          : 'Đổi điện thoại?',
        'continue'          : 'Tiếp tục',
        change_pass         : 'Đổi passwword',
        remember_me         : 'Tự động đăng nhập lần sau',
        code                : 'Mã',
        submit              : 'Gửi',
        username            : 'Username',
        password            : 'Password',
        new_pass            : 'Password mới',
        new_pass_confirm    : 'Xác nhận Password mới',
        lost_password       : 'Quên mật khẩu',
        reset_password      : 'Reset Password'
    },
    markdown_2factor        : {
        iphone              : '#####Install the Google Authenticator app for iPhone.\n\
\n\
- On your iPhone, tap the App Store icon.\n\
- Search for Google Authenticator.   \n\
([Download from the App Store]({{app_url}}))\n\
- Tap the app, and then tap Free to download and install it.\n\
\n\
#####Now open and configure Google Authenticator.\n\
\n\
- In Google Authenticator, tap "+", and then "Scan Barcode."\n\
- Use your phone\'s camera to scan this barcode.\n\
\n\
![QR Code]({{image_url}})\n\
\n\
Once you have scanned the barcode, enter the 6-digit verification code generated by the Authenticator app.',
        android             : '#####Install the Google Authenticator app for Android.\n\
\n\
- On your phone, go to the Google Play Store.\n\
- Search for Google Authenticator.   \n\
([Download from the Google Play Store]({{app_url}}))\n\
- Download and install the application.\n\
\n\
#####Now open and configure Google Authenticator.\n\
\n\
- In Google Authenticator, touch Menu and select "Set up account."\n\
- Select "Scan a barcode."\n\
- Use your phone\'s camera to scan this barcode.\n\
\n\
![QR Code]({{image_url}})\n\
\n\
Once you have scanned the barcode, enter the 6-digit verification code generated by the Authenticator app.',
        blackberry          : '#####Install the Google Authenticator app for BlackBerry\n\
\n\
- On your phone, open a web browser.\n\
- Go to *{{app_url}}*.\n\
- Download and install the Google Authenticator application.\n\
\n\
#####Now open and configure Google Authenticator.\n\
\n\
- In Google Authenticator, select Manual key entry.\n\
- In "Enter account name" type your full email address.\n\
- In "Enter key" type your secret key: ***{{secret_key}}***\n\
- Choose Time-based type of key.\n\
- Tap Save.\n\
\n\
Once you have scanned the barcode, enter the 6-digit verification code generated by the Authenticator app.',
    },
});