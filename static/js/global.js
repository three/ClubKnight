/**
 * global.js
 *
 * Global functions, and check browser support. Avoid modern javascript
 * features.
 */

var badSupportDialog;

function badSupport() {
    var c = getCookie("ignoresupport");
    if ( c && c==="1" )
        return;
    var dialog = document.createElement("div");
    dialog.innerHTML = "<h2>Browser not supported!</h2>"
                      +"<p>We have detected an older browser that do not "
                      +"support the features required to run ClubKnight! "
                      +"Please use a <a href=\"http://browsehappy.com/\">"
                      +"modern browser</a> to run ClubKnight.</p>"
                      +"<a class=\"bad-support-button\" onclick=\""
                      +"badSupportIgnore(false);\">Ignore</a>"
                      +"<a class=\"bad-support-button\" onclick=\""
                      +"badSupportIgnore(true);\">Ignore and don't show this "
                      +"message again</a>";
    dialog.id = "badSupport";
    document.body.appendChild(dialog);

    badSupportDialog = dialog;
}

function badSupportIgnore(future) {
    document.body.removeChild(badSupportDialog);

    if (future)
        setCookie("ignoresupport", "1", 864e5);
}

function setCookie(name, value, expire) {
    document.cookie = name + "=" + value + "; expires=" + expire + ";";
}

function getCookie(name) {
    var cookies = document.cookie.split(";");
    for (var i=0;i<cookies.length;i++) {
        var c = cookies[i];
        while (c.charAt(0)===" ")
            c = c.substring(1,c.length);
        if (c.indexOf(name) == 0)
            return c.substring(name.length,c.length);
    }
    return null;
}

try {
    eval("()=>{}");
} catch (err) {
    badSupport();
}
