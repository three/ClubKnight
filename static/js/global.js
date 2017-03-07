/**
 * global.js
 *
 * Global functions, and check browser support. Avoid modern javascript
 * features.
 */
/* eslint-disable */

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

function initDynamicForms() {
    var forms = document.getElementsByClassName("dynamic-form");
    for (var i=0;i<forms.length;i++)
        initDynamicForm(forms[i]);
}

// TODO: This could be cleaned up (low priority)
function initDynamicForm(form) {
    var submitters = form.getElementsByClassName("dynamic-submit");
    var responseFields = form.getElementsByClassName("dynamic-response");
    var submitter;
    for (var i=0;i<submitters.length;i++) {
        submitter = submitters[i];
        submitter.addEventListener("click", (function (evt) {
            var sbmter = this;

            evt.preventDefault();
            this.disabled = true;

            var inputs = form.getElementsByTagName("input");
            var params = "";
            for (var i=0;i<inputs.length;i++) {
                params = params
                    + encodeURIComponent(inputs[i].name)
                    + "="
                    + encodeURIComponent(inputs[i].value)
                    + "&";
            }
            params += "xhr=1";

            var xhr = new XMLHttpRequest();
            xhr.open("POST", form.action, true);
            xhr.setRequestHeader("Content-type",
                "application/x-www-form-urlencoded");
            xhr.onload = function (revt) {
                console.log("load", revt);
                sbmter.disabled = false;
                for (var i=0;i<inputs.length;i++) {
                    inputs[i].value = "";
                }

                if (!xhr.responseText)
                    return;
                var message = JSON.parse(xhr.responseText).message;
                var resText;
                for (var i=0;i<responseFields.length;i++) {
                    responseFields[i].innerHTML = "";
                    resText = document.createTextNode(message);
                    responseFields[i].appendChild(resText);
                }
            };
            xhr.onerror = function (revt) {
                console.log("error", revt);
                sbmter.disabled = false;

                var resText;
                for (var i=0;i<responseFields.length;i++) {
                    responseFields[i].innerHTML = "";
                    resText = document.createTextNode(
                        "Client Error! (check your internet?)"
                    );
                    responseFields[i].appendChild(resText);
                }
            };
            xhr.send(params);
        }).bind(submitter));
    }
}

try {
    eval("()=>{}");
} catch (err) {
    badSupport();
}

window.addEventListener("load", initDynamicForms);
