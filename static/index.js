function random_from_array(in_array) {
    return in_array[Math.floor(Math.random() * in_array.length)];
}

//https://stackoverflow.com/questions/273789/is-there-a-version-of-javascripts-string-indexof-that-allows-for-regular-expr
String.prototype.regexIndexOf = function(regex, startpos) {
    var indexOf = this.substring(startpos || 0).search(regex);
    return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}

//https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                                                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                                               );
}

//https://stackoverflow.com/questions/20817618/is-there-a-splice-method-for-strings
function spliceString(str, index, count, add) {
    var ar = str.split('');
    ar.splice(index, count, add);
    return ar.join('');
}

//https://stackoverflow.com/questions/14480345/how-to-get-the-nth-occurrence-in-a-string
function nthIndexOf(str, pat, n){
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.regexIndexOf(pat, i);
        if (i < 0) break;
    }
    return i;
}

function material_check(elem) {
    console.log(elem.dataset.checked);
    if (elem.dataset.checked == "") {
        elem.dataset.checked = "checked";
    } else {
        elem.dataset.checked = "";
    }
}

var card_open = false;
var current_column = 0;
var maximum_column = 2;

var cards = [];

var selected_card_uuids = [];

function org_to_cards(org_text) {
    cards = [];

    var level_one_regex = new RegExp('(^|\\n)(?=\\*[^\\*])','gi');
    var split_org_text = org_text.split(level_one_regex);

    split_org_text.forEach(function(line) {
        if (line[0] === "*") {
            cards.push({title:line.split("\n")[0].replace(new RegExp('\\* *','gi'),'').replace(new RegExp(':.*:','gi'),''),
                        text:line.split("\n").slice(1).join("\n"),
                        uuid:uuidv4(),
                        tag:(line.split("\n")[0].match(new RegExp(':.*:','gi')) || [""])[0]});
        }
    });
    add_cards(cards);
}

function cards_to_org() {
    var org_text = "";
    cards.forEach(function(card) {
        org_text += "* " + card.title + " " + card.tag + "\n" + card.text + "\n";
    });

    //Clean up extraneous newlines
    org_text = org_text.replace(new RegExp("\\n+(?=(\\*|$))", "gi"), "\n");

    return org_text;
}

function update_server_data() {
    var new_org_text = cards_to_org();
    $.ajax({type:'POST',
        url:"/notebooks/update/" + document.querySelector(".sidebar-button.selected .sidebar-title").innerText,
        data:JSON.stringify({"data":new_org_text}),
        contentType: "application/json",
        dataType: "json"});
}

function update_card_data(uuid,new_title,new_text) {
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].uuid === uuid) {
            cards[i].title = new_title;
            cards[i].text = new_text;
        }
    }

    update_server_data();
}

function get_card_index_by_uuid(uuid) {
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].uuid == uuid) {
            return i;
        }
    }
}

function card_clicked(elem) {
    if (card_open) {
        return;
    }

    card_open = true;

    var absolute_card = document.getElementsByClassName("absolute-card")[0];
    var new_card = absolute_card.cloneNode(true);
    var rect = elem.getBoundingClientRect();

    document.body.appendChild(new_card);
    new_card.style.top = rect.top.toString() + "px";
    new_card.style.left = rect.left.toString() + "px";
    new_card.style.width = elem.offsetWidth.toString() + "px";
    new_card.style.height = elem.offsetHeight.toString() + "px";

    new_card.getElementsByClassName("title")[0].value = cards[get_card_index_by_uuid(elem.dataset.uuid)].title.replace("\\n", String.fromCharCode(13, 10));
    new_card.getElementsByClassName("text")[0].value = cards[get_card_index_by_uuid(elem.dataset.uuid)].text.replace("\\n", String.fromCharCode(13, 10));

    new_card.style.display = "block";
    document.getElementById("edit-overlay").style.pointerEvents = "auto";
    elem.style.opacity = "0";
    elem.id = "card-opened";

    new_card.id = "card-editable";


    window.setTimeout(function () {
        new_card.style.left = "25%";
        new_card.style.width = "50%"
        new_card.style.top = "15%";
        new_card.style.height = "70%";

        document.getElementById("edit-overlay").style.opacity = 1;
    },100);
}

function edit_overlay_clicked() {
    card_open = false;
    var new_card = document.getElementById("card-editable");
    var old_card = document.getElementById("card-opened");

    update_card_data(old_card.dataset.uuid, new_card.getElementsByClassName("title")[0].value, new_card.getElementsByClassName("text")[0].value);
    old_card.getElementsByClassName("title")[0].innerHTML = format_orgtext(new_card.getElementsByClassName("title")[0].value);
    old_card.getElementsByClassName("text")[0].innerHTML = format_orgtext(new_card.getElementsByClassName("text")[0].value);

    var rect = document.getElementById("card-opened").getBoundingClientRect();

    document.getElementById("edit-overlay").style.opacity = 0;
    document.getElementById("edit-overlay").style.pointerEvents = "none";

    new_card.style.top = rect.top.toString() + "px";
    new_card.style.left = rect.left.toString() + "px";
    new_card.style.width = old_card.offsetWidth.toString() + "px";
    new_card.style.height = old_card.offsetHeight.toString() + "px";
    new_card.style.boxShadow = "none";

    old_card.id = "";

    window.setTimeout(function () {
        new_card.remove();
        old_card.style.opacity = "1";
    },300);
}

function add_card(card,just_created) {
    var title = card.title;
    var text = card.text;
    var uuid = card.uuid;
    var tag = card.tag || "";
    
    if (just_created) {
        current_column = 0;
    }

    var template_card = document.getElementById("template-card");
    var new_card = template_card.cloneNode(true);

    new_card.dataset.uuid = uuid;

    new_card.getElementsByClassName("title")[0].innerHTML = format_orgtext(title);
    new_card.getElementsByClassName("text")[0].innerHTML = format_orgtext(text);
    new_card.querySelector(".card-label").innerText = tag.replace(/(^:|:$)/gi,'').replace(/:/gi,' ');

    new_card.style.display = "block";

    new_card.id = "";

    if (just_created) {
        document.getElementById(current_column.toString()).prepend(new_card);
    } else {
        document.getElementById(current_column.toString()).appendChild(new_card);
    }
    current_column += 1;
    if (current_column > maximum_column) {
        current_column = 0;
    }

    document.getElementById("card-placeholder").style.display="none";

    return new_card;
}

function remove_card_button(elem) {
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].uuid === elem.dataset.uuid) {
            cards.splice(i, 1);
            add_cards(cards);
            update_server_data();
            return;
        }
    }
}

function add_cards(card_array) {
    current_column = 0;
    
    selected_card_uuids = [];
    document.getElementById("header-selected").style.opacity = 0;
    document.getElementById("header-selected").style.pointerEvents = "none";
    document.getElementById("header-default").style.opacity = 1;
    document.getElementById("header-default").style.pointerEvents = "auto";
    
    Array.from(document.getElementsByClassName("card")).forEach(function(e) {
        if (e.id != "template-card") {
            e.remove();
        }
    });

    for (var i = 0; i < card_array.length; i++) {
        card_array[i].elem = add_card(card_array[i], false);
    }
}

function add_card_clicked() {
    var uuid = uuidv4();
    cards.unshift({title:"",text:"",uuid:uuid,elem:add_card({title:"",text:"",uuid:uuid,tag:""},true)});
    add_cards(cards);
    card_clicked(document.querySelectorAll('[data-uuid="'+uuid+'"]')[0]);
}

function format_orgtext(text) {
    if (text === "" || text == null) {
        return "...";
    }

    links = text.match(new RegExp('(http:\\/\\/)*(https:\\/\\/)*[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)','gi'));
    if (links != null) {
        links.forEach(function(e) {
            text = text.replace(e, "LINK_PLACEHOLDER");
        });
    }

    var formatted_text = text.replace(new RegExp('\/','gi'),"&#47;").split("\n");

    var format_symbols = {"*":["<b>","</b>"],
                          "&#47;":["<i>","</i>"],
                          "_":["<u>","</u>"],
                          /*"=":["<code>","</code>"],*/
                          "~":["<q>","</q>"]};

    var indent_level = 0;
    var current_indent_level = 0;

    var to_pop = [];
    for (var i = 0; i < formatted_text.length; i++) {

        current_indent_level = indent_level;

        //formatted_text[i] = formatted_text[i].replace(new RegExp("^\\s.*?(?=[^\\s])", "gi"), "");

        if (formatted_text[i].match(new RegExp('\\*\\*+','gi')) != null) {
            indent_level = formatted_text[i].match(new RegExp('\\*\\*+','gi'))[0].length - 1;
            current_indent_level = formatted_text[i].match(new RegExp('\\*\\*+','gi'))[0].length - 2;
            formatted_text[i] = formatted_text[i].replace(/\*\*+/gi, "<span class='org-title'>&bull;");
            formatted_text[i] = formatted_text[i] + "</span>";
        }

        if (formatted_text[i].match(new RegExp('\-\-\-\-\-\-*','gi')) != null) {
            formatted_text[i] = "——————————";
        }

        if (formatted_text[i] === "") {
            //formatted_text.splice(i,1);
            //i-=1;
            to_pop.push(i);
        }

        for (var k = 0; k < current_indent_level; k++) {
            formatted_text[i] = "   " + formatted_text[i];
        }
    }

    to_pop.forEach(function(e) {
        formatted_text.splice(e,1);
        for (var i = 0; i < to_pop.length; i++) {
            to_pop[i] = to_pop[i] - 1;
        }
    });

    //console.log(formatted_text);

    formatted_text = formatted_text.join("\n");
    Object.keys(format_symbols).forEach(function(key) {
        matches = formatted_text.match(new RegExp('\\'+key+'(.|[\n])*?(\\'+key+')','gi'));
        if (matches != null) {
            for (var i = 0; i < matches.length; i++) {
                formatted_text = formatted_text.replace(key,format_symbols[key][0]);
                formatted_text = formatted_text.replace(key,format_symbols[key][1]);
            }
        }
    });

    var occurrence = -1;
    formatted_text = formatted_text.replace(new RegExp('(TODO|DONE)','g'), function (match, p1, offset, original_string) {
        occurrence += 1;
        if (match == "TODO") {
            return "<span class='TODO'><i class='material-icons org-checkbox' onclick='org_checkbox_clicked(this)' data-occurrence='"+occurrence.toString()+"'>check_box_outline_blank</i> <span class='checkbox-text'>TODO</span></span>";
        } else if (match == "DONE") {
            return "<span class='DONE'><i class='material-icons org-checkbox' onclick='org_checkbox_clicked(this)' data-occurrence='"+occurrence.toString()+"'>check_box</i> <span class='checkbox-text'>DONE</span></span>";
        }
        return match;
    });

    /*formatted_text = formatted_text.replace(new RegExp('TODO','g'),
                                            "<span class='TODO'><i class='material-icons org-checkbox' onclick='org_checkbox_clicked(this)'>check_box_outline_blank</i> <span class='text'>TODO</span></span>");
    formatted_text = formatted_text.replace(new RegExp('DONE','g'),
                                            "<span class='DONE'><i class='material-icons org-checkbox' onclick='org_checkbox_clicked(this)'>check_box</i> <span class='text'>DONE</span></span>");*/


    if (links != null) {
        links.forEach(function(e) {
            formatted_text = formatted_text.replace("LINK_PLACEHOLDER","<a href='" + e + "'>" + e + "</a>");
        });
    }

    return formatted_text;
}

function sidebar_click(elem) {
    if (document.querySelector(".sidebar-button.selected") != null) {
        document.querySelector(".sidebar-button.selected").classList.remove("selected");
    }
    elem.classList.add("selected");

    document.querySelector(".add-card").style.opacity = 1;
    document.querySelector(".add-card").style.pointerEvents = "auto";
        
    $.get("/notebooks/read/" + elem.getElementsByClassName("sidebar-title")[0].innerText, function(data) {
        org_to_cards(data["data"]);
        if (cards.length == 0) {
            document.getElementById("card-placeholder").innerHTML = "There aren't any cards...<br>Add one?";
            document.getElementById("card-placeholder").style.display = "block";
        }
    });
}

function card_toggled(checkbox, elem) {
    if (checkbox.dataset.checked != "") {
        selected_card_uuids.push(elem.dataset.uuid);
        elem.classList.add("selected-card");
    } else {
        selected_card_uuids.splice(selected_card_uuids.indexOf(elem.dataset.uuid), 1);
        elem.classList.remove("selected-card");
    }
    
    if (selected_card_uuids.length > 0) {
        document.getElementById("header-selected").style.opacity = 1;
        document.getElementById("header-selected").style.pointerEvents = "auto";
        document.getElementById("header-num-selected").innerText = selected_card_uuids.length.toString() + " selected";

        document.getElementById("header-default").style.opacity = 0;
        document.getElementById("header-default").style.pointerEvents = "none";
    } else {
        document.getElementById("header-selected").style.opacity = 0;
        document.getElementById("header-selected").style.pointerEvents = "none";
        
        document.getElementById("header-default").style.opacity = 1;
        document.getElementById("header-default").style.pointerEvents = "auto";
    }
}

function org_checkbox_clicked(elem) {
    if (elem.innerText == "check_box") {
        //DONE -> TODO
        cards[get_card_index_by_uuid(elem.closest(".card").dataset.uuid)].text = spliceString(cards[get_card_index_by_uuid(elem.closest(".card").dataset.uuid)].text,
            nthIndexOf(cards[get_card_index_by_uuid(elem.closest(".card").dataset.uuid)].text, new RegExp("(TODO|DONE)","g"), parseInt(elem.dataset.occurrence)+1),
            elem.parentNode.getElementsByClassName("checkbox-text")[0].innerText.length,
            "TODO");

        elem.innerText = "check_box_outline_blank";
        elem.parentNode.getElementsByClassName("checkbox-text")[0].innerText = "TODO";
        elem.parentNode.classList.remove("DONE");
        elem.parentNode.classList.add("TODO");
    } else {
        //TODO -> DONE
        cards[get_card_index_by_uuid(elem.closest(".card").dataset.uuid)].text = spliceString(cards[get_card_index_by_uuid(elem.closest(".card").dataset.uuid)].text,
            nthIndexOf(cards[get_card_index_by_uuid(elem.closest(".card").dataset.uuid)].text, new RegExp("(TODO|DONE)","g"), parseInt(elem.dataset.occurrence)+1),
            elem.parentNode.getElementsByClassName("checkbox-text")[0].innerText.length,
            "DONE");

        elem.innerText = "check_box";
        elem.parentNode.getElementsByClassName("checkbox-text")[0].innerText = "DONE";
        elem.parentNode.classList.remove("TODO");
        elem.parentNode.classList.add("DONE");
    }

    update_server_data();
}

function set_label(user_input, elem) {
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].uuid == elem.dataset.uuid) {
            cards[i].tag = ":" + user_input.split(new RegExp('\\s+','gi')).join(":") + ":";
        }
    }
    elem.getElementsByClassName("card-label")[0].innerText = user_input;
    hide_input();
    
    update_server_data();
}

function move_card_button(elem) {
    Array.from(document.querySelectorAll(".card:not(#template-card)")).forEach(function(card) {
        card.classList.add("move-mode");

        //Otherwise this is clicked instantly
        window.setTimeout(function() {
            card.onclick = function() {
                swap_cards(elem.dataset.uuid, card.dataset.uuid);
            }
        },100);
    });
}

function swap_cards(uuid1,uuid2) {
    //console.log(uuid1 + " " + uuid2);
    if (uuid1 == uuid2) {
        add_cards(cards);
        return;
    }

    var index1 = get_card_index_by_uuid(uuid1);
    var index2 = get_card_index_by_uuid(uuid2);

    var temp_card = cards[index1];
    cards[index1] = cards[index2];
    cards[index2] = temp_card;

    add_cards(cards);

    update_server_data();
}

function hide_input() {
    document.getElementById("input-popup").style.opacity = 0;
    document.getElementById("input-popup").style.pointerEvents = "none";
    document.getElementById("input-overlay").style.opacity = 0;
    document.getElementById("input-overlay").style.pointerEvents = "none";
    document.getElementById("input-popup-entry").value = "";
}

function show_input(title, placeholder, ok_callback, args) {
    document.getElementById("input-popup-title").innerText = title;
    document.getElementById("input-popup-entry").placeholder = placeholder;
    document.getElementById("input-popup-done").onclick = function() {
        if (args == null) {
            ok_callback(document.getElementById("input-popup-entry").value);
        } else {
            ok_callback.apply(this, [document.getElementById("input-popup-entry").value].concat(args));
        }
    }

    document.getElementById("input-popup").style.opacity = 1;
    document.getElementById("input-popup").style.pointerEvents = "auto";
    document.getElementById("input-overlay").style.opacity = 1;
    document.getElementById("input-overlay").style.pointerEvents = "auto";

    document.getElementById("input-popup-entry").focus();
}

function populate_sidebar() {
    var selected_notebook = document.querySelector(".sidebar-button.selected .sidebar-title");

    Array.from(document.querySelectorAll(".sidebar-button:not(#template-notebook)")).forEach(function(e) {
        e.remove();
    });

    $.get("/notebooks/list", function(data) {
        data["list"].forEach(function (e) {
            var template_notebook = document.getElementById("template-notebook");
            var new_notebook = template_notebook.cloneNode(true);
            new_notebook.getElementsByClassName("sidebar-title")[0].innerText = e.replace(".org","");
            new_notebook.style.display="block";
            new_notebook.id = "";
            document.getElementById("sidebar").appendChild(new_notebook);
            window.setTimeout(function () {
                new_notebook.style.opacity = 1;
            },100);
        });

        if (selected_notebook != null) {
            Array.from(document.querySelectorAll(".sidebar-button:not(#template-notebook)")).forEach(function(e) {
                if (e.querySelector(".sidebar-title").innerText == selected_notebook.innerText) {
                    e.classList.add("selected");
                }
            });
        } else {
            add_cards([]);
        }
    });

    document.querySelector(".toggle-delete-notebooks").classList.toggle("notebook-toggled", false);
}

function create_notebook(notebook_title) {
    $.get("/notebooks/create/" + notebook_title, function() {
        populate_sidebar();
    });

    hide_input();
}

function delete_notebook(notebook_title) {
    $.get("/notebooks/delete/" + notebook_title, function () {
        populate_sidebar();
    });
}

function notebook_edit_toggle(elem) {
    elem.classList.toggle("notebook-toggled");
    document.querySelectorAll(".sidebar-button:not(#template-notebook)").forEach(function(e) {
        var toggled = e.classList.toggle("delete-highlight");
        if (toggled) {
            e.onclick = function() {
                delete_notebook(this.getElementsByClassName("sidebar-title")[0].innerText);
            }
        } else {
            e.onclick = function() {
                sidebar_click(this);
            }
        }
    });
}

function for_each_selected(selected_callback) {
    selected_cards = Array.from(document.querySelectorAll(".selected-card"));
    
    selected_cards.forEach(function(card) {
        selected_callback(card);
    });
}

window.onload = function () {
    //for (var i = 0; i < 100; i++) {
    //    add_card(random_from_array(["Bingletown","Who?","We found THREE guys moping around over there, can you deal with it?"]),
    //        random_from_array(["rabbit it","1. Who?\n2. Why\n3. Definitely, i'm up for it",""]));
    //}

    populate_sidebar();
    add_cards(cards);
}