/**
 * -----------------------------------
 * Global Variables
 * -----------------------------------
 */

var temporaryMsgId = 0;
var activeUsersIds = [];

const messageForm = $(".message-form"),
    messageInput = $(".message-input"),
    messageBoxContainer = $(".wsus__chat_area_body"),
    csrf_token = $("meta[name=csrf_token]").attr("content"),
    auth_id = $("meta[name=auth_id]").attr("content"),
    url = $("meta[name=url]").attr("content"),
    messengerContactBox = $(".messenger-contacts");

const getMessengerId = () => $("meta[name=id]").attr("content");
const setMessengerId = (id) => $("meta[name=id]").attr("content", id);

/**
 *------------------------
 * Reusable Function
 *------------------------
 */

//This is for the load bar and the opacity of the chat
function enableChatBoxLoader() {
    $(".wsus__message_paceholder").removeClass("d-none");
}

function disableChatBoxLoader() {
    $(".wsus__chat_app").removeClass("show_info");
    $(".wsus__message_paceholder").addClass("d-none");
    $(".wsus__message_paceholder_black").addClass("d-none");
}

//This function is for avatar
function imagePreview(input, selector) {
    if (input.files && input.files[0]) {
        var render = new FileReader();

        render.onload = function (e) {
            $(selector).attr("src", e.target.result);
        };

        render.readAsDataURL(input.files[0]);
    }
}

//This function is for searching
let searchPage = 1;
let noMoreDataSearch = false;
let searchTempVal = ""; //if type another value
let setSearchLoading = false;

function searchUsers(query) {
    if (query != searchTempVal) {
        searchPage = 1;
        noMoreDataSearch = false;
    }
    searchTempVal = query;

    if (!setSearchLoading && !noMoreDataSearch) {
        $.ajax({
            method: "GET",
            url: "/messenger/search",
            data: { query: query, page: searchPage },
            beforeSend: function () {
                setSearchLoading = true;
                let loader = `
                <div class="text-center search-loader">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                `;
                $(".user_search_list_result").append(loader);
            },
            success: function (data) {
                setSearchLoading = false;
                $(".user_search_list_result").find(".search-loader").remove();

                if (searchPage < 2) {
                    $(".user_search_list_result").html(data.records);
                } else {
                    $(".user_search_list_result").append(data.records);
                }

                noMoreDataSearch = searchPage >= data?.last_page;
                if (!noMoreDataSearch) searchPage += 1;
            },
            error: function (xhr, status, error) {
                setSearchLoading = false;
                $(".user_search_list_result").find(".search-loader").remove();
            },
        });
    }
}

function actionOnScroll(selector, callback, topScroll = false) {
    $(selector).on("scroll", function () {
        let element = $(this).get(0);
        const condition = topScroll
            ? element.scrollTop == 0
            : element.scrollTop + element.clientHeight >= element.scrollHeight;

        if (condition) {
            callback();
        }
    });
}

//This function is for dealy the search
function debounce(callback, delay) {
    let timerId;
    return function (...args) {
        clearTimeout(timerId);
        timerId = setTimeout(() => {
            callback.apply(this, args);
        }, delay);
    };
}

/**
 * ----------------------------------------------
 * Fetch id data of user and update the view
 * ----------------------------------------------
 */

function IDinfo(id) {
    $.ajax({
        method: 'GET',
        url: '/messenger/id-info',
        data: { id: id },
        beforeSend: function () {
            NProgress.start();
            enableChatBoxLoader();
        },
        success: function (data) {
            // fetch messages
            fetchMessages(data.fetch.id, true);

            $('.wsus__chat_info_gallery').html("");

            // load gallery
            if (data?.shared_photos) {
                $('.nothing_share').addClass('d-none');
                $('.wsus__chat_info_gallery').html(data.shared_photos);
            } else {
                $('.nothing_share').removeClass('d-none');
            }

            

            data.favorite == 1
                ? $('.favourite').addClass('active')
                : $('.favourite').removeClass('active');

            $(".messenger-header").find("img").attr("src", data.fetch.avatar);
            $(".messenger-header").find("h4").text(data.fetch.name);

            $(".messenger-info-view .user_photo").find("img").attr("src", data.fetch.avatar);
            $(".messenger-info-view").find(".user_name").text(data.fetch.name);
            $(".messenger-info-view").find(".user_unique_name").text(data.fetch.user_name);
            NProgress.done();
        },
        error: function (xhr, status, error) {
            disableChatBoxLoader();
        }
    });
}

/**
 *------------------------
 * send message
 *------------------------
 */

function sendMessage() {
    temporaryMsgId += 1;
    let tempID = `temp_${temporaryMsgId}`;
    let hasAttachment = !!$(".attachment-input").val();
    const inputValue = messageInput.val();

    if (inputValue.length > 0 || hasAttachment) {
        const formData = new FormData($(".message-form")[0]);
        formData.append("id", getMessengerId());
        formData.append("temporaryMsgId", tempID);
        formData.append("_token", csrf_token);
        $.ajax({
            method: "POST",
            url: "messenger/send-message",
            data: formData,
            dataType: "JSON",
            processData: false,
            contentType: false,
            beforeSend: function () {
                if (hasAttachment) {
                    messageBoxContainer.append(
                        sendTempMessageCard(inputValue, tempID, true)
                    );
                } else {
                    messageBoxContainer.append(
                        sendTempMessageCard(inputValue, tempID)
                    );
                }
                messageFormRest();
            },
            success: function (data) {
                const tempMsgCardElement = messageBoxContainer.find(
                    `.message-card[data-id=${data.tempID}]`
                );
                tempMsgCardElement.before(data.message);
                tempMsgCardElement.remove();
            },
            error: function (xhr, status, error) {},
        });
    }
}

//handle the send msg in the body
function sendTempMessageCard(message, tempId, attachment = false) {
    if (attachment) {
        return `
        <div class="wsus__single_chat_area message-card" data-id="${tempId}">
            <div class="wsus__single_chat chat_right">
                <div class="pre_loader">
                    <div class="spinner-border text-light" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                ${
                    message.length > 0
                        ? `<p class="messages">${message}</p>`
                        : ""
                }

                <span class="clock"><i class="fas fa-clock"></i> now</span>
            </div>
        </div>
        `;
    } else {
        return `
        <div class="wsus__single_chat_area message-card" data-id="${tempId}">
            <div class="wsus__single_chat chat_right">
                <p class="messages">${message}</p>
                <span class="clock"><i class="fas fa-clock"></i> now</span>
            </div>
        </div>
        `;
    }
}

/**
 * ----------------------------------------------
 * Fetch messages from database
 * ----------------------------------------------
 */

let messagesPage = 1;
let noMoreMessages = false;
let messagesLoading = false;

function fetchMessages(id, newFetch = false) {
    if (newFetch) {
        messagesPage = 1;
        noMoreMessages = false;
    }

    if (!noMoreMessages && !messagesLoading) {
        $.ajax({
            method: "GET",
            url: "/messenger/fetch-messages",
            data: {
                _token: csrf_token,
                id: id,
                page: messagesPage,
            },
            beforeSend: function () {
                messagesLoading = true;
                let loader = `
                <div class="text-center messages-loader">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                `;
                messageBoxContainer.prepend(loader);
            },
            success: function (data) {
                messagesLoading = false;
                // remove the loader
                messageBoxContainer.find(".messages-loader").remove();
                // make messages seen

                if (messagesPage == 1) {
                    messageBoxContainer.html(data.messages);
                    scrollToBottom(messageBoxContainer);
                } else {
                    const lastMsg = $(messageBoxContainer)
                        .find(".message-card")
                        .first();
                    const curOffset =
                        lastMsg.offset().top - messageBoxContainer.scrollTop();

                    messageBoxContainer.prepend(data.messages);
                    messageBoxContainer.scrollTop(
                        lastMsg.offset().top - curOffset
                    );
                }

                // pagination lock and page increment
                noMoreMessages = messagesPage >= data?.last_page;
                if (!noMoreMessages) messagesPage += 1;

                disableChatBoxLoader();
            },
            error: function (xhr, status, error) {
                console.log(error);
            },
        });
    }
}

/**
 * ----------------------------------------------
 * Fetch Contact list from database
 * ----------------------------------------------
 */

let contactsPage = 1;
let noMoreContacts = false;
let contactLoading = false;

function getContacts() {
    if (!contactLoading && !noMoreContacts) {
        $.ajax({
            method: "GET",
            url: "messenger/fetch-contacts",
            data: { page: contactsPage },
            beforeSend: function () {
                contactLoading = true;
                let loader = `
                <div class="text-center contact-loader">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                `;
                messengerContactBox.append(loader);
            },
            success: function (data) {
                contactLoading = false;
                messengerContactBox.find(".contact-loader").remove();
                if (contactsPage < 2) {
                    messengerContactBox.html(data.contacts);
                } else {
                    messengerContactBox.append(data.contacts);
                }

                noMoreContacts = contactsPage >= data?.last_page;
                if (!noMoreContacts) contactsPage += 1;
            },
            error: function (xhr, status, error) {
                contactLoading = false;
                messengerContactBox.find(".contact-loader").remove();
            },
        });
    }
}

/**
 * ----------------------------------------------
 * Favorite
 * ----------------------------------------------
 */
function star(user_id) {
    $(".favourite").toggleClass('active');

    $.ajax({
        method: "POST",
        url: "messenger/favorite",
        data: {
            _token: csrf_token,
            id: user_id
        },
        success: function (data) {
            if (data.status == 'added') {
                notyf.success('Added to favorite list.');
            } else {
                notyf.success('Removed from favorite list.');
            }
        },
        error: function (xhr, status, error) {

        }
    })
}

//function for cancel the img and msg
function messageFormRest() {
    $(".attachment-block").addClass("d-none");
    $(".emojionearea-editor").text("");
    messageForm.trigger("reset");
}

/**
 * ----------------------------------------------
 * Slide to bottom on action
 * ----------------------------------------------
 */
function scrollToBottom(container) {
    $(container)
        .stop()
        .animate({
            scrollTop: $(container)[0].scrollHeight,
        });
}

/**
 *------------------------
 * Dom LOad
 *------------------------
 */
getContacts();

$("#select_file").change(function () {
    imagePreview(this, ".profile-image-preview");
});

// Search action on keyup
const debouncedSearch = debounce(function () {
    const value = $(".user_search").val();
    searchUsers(value);
}, 500);

$(".user_search").on("keyup", function () {
    let query = $(this).val();
    if (query.length > 0) {
        debouncedSearch();
    }
});
// search pagination
actionOnScroll(".user_search_list_result", function () {
    let value = $(".user_search").val();
    searchUsers(value);
});

//click action for messenger list item
$("body").on("click", ".messenger-list-item", function () {
    const dataId = $(this).attr("data-id");
    setMessengerId(dataId);
    IDinfo(dataId);
});

//for sending message
$(".message-form").on("submit", function (e) {
    e.preventDefault();
    sendMessage();
});

//for sending attachment
$(".attachment-input").change(function () {
    imagePreview(this, ".attachment-preview");
    $(".attachment-block").removeClass("d-none");
});

//for cancelation img &msg
$(".cancel-attachment").on("click", function () {
    messageFormRest();
});

// message pagination
actionOnScroll(
    ".wsus__chat_area_body",
    function () {
        fetchMessages(getMessengerId());
    },
    true
);

    // add/remove to favorite
    $(".favourite").on('click', function (e) {
        e.preventDefault();
        star(getMessengerId());
    })
