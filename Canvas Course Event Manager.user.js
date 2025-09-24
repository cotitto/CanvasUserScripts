// ==UserScript==
// @name         Canvas Course Event Manager
// @namespace    https://github.com/sukotsuchido/CanvasUserScripts
// @version      1.1
// @description  A Canvas UserScript to manage course events
// @author       Chad Scott (ChadScott@katyisd.org)
// @include      https://*.instructure.com/calendar* 
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    // Prevent jQuery conflicts with Canvas added by xc0009
    var $j = jQuery.noConflict(true);

    var assocRegex3 = new RegExp('^/calendar');
    var errors = [];
    var courseId = '';
    var termId = '';
    var courses = [];
    var allCourses = [];
    var wholeName = '';
    var array =[];
    var user = '';

    var roles = ENV.current_user_roles;
    var buttonRoles = ["admin", "teacher", "root_admin"];
    var test1 = buttonRoles.some(el => roles.includes(el));
    if ((test1 === true) && (assocRegex3.test(window.location.pathname))) {
        add_button();
    }

    function add_button() {
        var parent = document.querySelector('aside#right-side');
        if (parent) {
            var el = parent.querySelector('#manage_events');
            if (!el) {
                el = document.createElement('button');
                el.classList.add('Button');
                el.type = 'button';
                el.id = 'manage_events';
                var icon = document.createElement('i');
                icon.classList.add('icon-edit');
                el.appendChild(icon);
                var txt = document.createTextNode(' Manage Course Events');
                el.appendChild(txt);
                el.addEventListener('click', openDialog);
                parent.appendChild(el);
            }
        }
    }

    function getCourses(){
        errors = [];
        var url = "/api/v1/users/self/courses?include[]=term&per_page=75";
        $j.ajax({
            async: true,
            type: "GET",
            global: true,
            dataType: 'JSON',
            data: JSON.stringify(courses),
            contentType: "application/json",
            url: url,
            success: function(courses){
                allCourses = Array.from(courses.reduce((m, t) => m.set(t.id, t), new Map()).values());
                var toAppend = '';
                var select = document.getElementById('event_course');
                select.options.length = 0;
                $j.each(allCourses, function(i, o){
                    if(o.name !== undefined){
                        toAppend += '<option value="'+o.id+'">'+o.name+'</option>';
                    }
                });
                var blank = '<option value="">Please select</option>';
                $j('#event_course').append(blank);
                $j('#event_course').append(toAppend);
            }
        });
    }

    function getEvents(){
        errors = [];
        courseId = document.getElementById('event_course').value;
        var url = "/api/v1/users/self/calendar_events?per_page=150&all_events=true&context_codes[]=course_"+courseId;
        $j.ajax({
            async: true,
            type: "GET",
            global: true,
            dataType: 'JSON',
            data: JSON.stringify(courses),
            contentType: "application/json",
            url: url,
            success: function (data) {
                var toAppend;
                var clear = document.getElementById('inner_table');
                if (clear.innerHTML !== null){
                    clear.innerHTML = "";
                }
                $j.each(data, function(i, o){
                    var date = new Date(o.start_at);
                    var dateStr = (date.getMonth()+1)+"/"+date.getDate()+"/"+date.getFullYear();

                    var date2 = new Date(o.end_at);
                    var dateStr2 = (date2.getMonth()+1)+"/"+date2.getDate()+"/"+date2.getFullYear();

                    toAppend += '<tr><td><input type="checkbox" id="'+o.id+'" name="events" value="'+o.id+'"></td><td>'+o.title+'</td><td>'+dateStr+'</td><td>'+dateStr2+'</td></tr>';
                });
                $j('#table_header').append(toAppend);
            }
        });
    }

    function deleteEvents(){
        $j.each(array, function(index, item){
            var url = "/api/v1/calendar_events/" + item;
            $j.ajax({
                async: true,
                type: "DELETE",
                global: true,
                dataType: 'JSON',
                data: JSON.stringify(),
                contentType: "application/json",
                url: url,
                success: open_success_dialog
            });
        });
        window.location.reload(true);
    }

    function removeDates(){
        $j.each(array, function(index, item){
            var url = "/api/v1/calendar_events/" + item + "?calendar_event[start_at]=null&calendar_event[end_at]=null";
            $j.ajax({
                async: true,
                type: "PUT",
                global: true,
                dataType: 'JSON',
                data: JSON.stringify(),
                contentType: "application/json",
                url: url,
                success: open_success_dialog
            });
        });
        window.location.reload(true);
    }

    function createDialog() {
        var el = document.querySelector('#events_dialog');
        if (!el) {
            el = document.createElement('div');
            el.id = 'events_dialog';

            var el2 = document.createElement('div');
            el2.classList.add('ic-Form-control');
            el.appendChild(el2);

            var label = document.createElement('label');
            label.htmlFor = 'event_course';
            label.textContent = 'Step 1: Select Course:';
            label.classList.add('ic-Label');
            el2.appendChild(label);

            var select = document.createElement('select');
            select.id = 'event_course';
            select.classList.add('ic-Input');
            select.onchange = getEvents;
            el2.appendChild(select);

            var table = document.createElement('TABLE');
            table.id = 'table_header';
            table.style.width = '100%';
            table.classList.add("ic-Table", "ic-Table--hover-row", "ic-Table--striped");
            el.appendChild(table);

            var tr = document.createElement('TR');
            table.appendChild(tr);

            var th = document.createElement('TH');
            var input = document.createElement('input');
            input.type = 'checkbox';
            input.name = 'select-all';
            input.id = 'select-all';
            input.onchange = setEvents;
            th.appendChild(input);
            th.classList.add('ic-Checkbox-group');
            tr.appendChild(th);

            th = document.createElement('TH');
            th.textContent = 'Event Title';
            tr.appendChild(th);
            th = document.createElement('TH');
            th.textContent = 'Start Date';
            tr.appendChild(th);
            th = document.createElement('TH');
            th.textContent = 'End Date';
            tr.appendChild(th);

            var tbody = document.createElement('tbody');
            tbody.id = 'inner_table';
            tbody.onchange = setEvents;
            table.appendChild(tbody);

            var notice = document.createElement('div');
            notice.id = 'app';
            el.appendChild(notice);

            var hr = document.createElement('HR');
            el.appendChild(hr);

            var el3 = document.createElement('div');
            el3.innerHTML = '<fieldset class="ic-Fieldset ic-Fieldset--radio-checkbox"><legend class="ic-Legend">For Selected Events:</legend><div class="ic-Form-control ic-Form-control--radio ic-Form-control--radio-inline"><div class="ic-Radio"><input id="remove_dates" type="radio" value="remove_dates" name="action" checked><label for="remove_dates" class="ic-Label">Remove Dates</label></div><div class="ic-Radio"><input id="delete_events" type="radio" value="delete_events" name="action"><label for="delete_events" class="ic-Label">Delete Events</label></div></div></fieldset>';
            el.append(el3);

            var msg = document.createElement('div');
            msg.id = 'events_msg';
            msg.style.display = 'none';
            el.appendChild(msg);

            var parent = document.querySelector('body');
            parent.appendChild(el);
        }

        $j('#select-all').click(function(event) {
            var state = this.checked;
            $j(':checkbox').each(function() {
                this.checked = state;
            });
        });
    }

    function setEvents() {
        array = $j.map($j('input[name="events"]:checked'), function(c) {
            return c.value;
        });
    }

    function openDialog() {
        try {
            createDialog();
            $j('#events_dialog').dialog({
                title: 'Manage Course Events',
                autoOpen: false,
                closeOnEscape: false,
                open: function () {
                    getCourses();
                    $j(".ui-dialog-titlebar-close").hide();
                    $j(".ui-dialog").css("top", "10px");
                },
                buttons: [{
                    text: 'Cancel',
                    click: function() {
                        $j(this).dialog('destroy').remove();
                        errors = [];
                        updateMsgs();
                    }
                },{
                    text: 'Submit',
                    class: 'Button Button--primary',
                    click: submitButton
                }],
                modal: true,
                resizable: false,
                height: 600,
                width: '40%',
                scrollable: true
            });

            if (!$j('#events_dialog').dialog('isOpen')) {
                $j('#events_dialog').dialog('open');
            }

        } catch (e) {
            console.log(e);
        }
    }

    function submitButton() {
        var action = document.querySelector('input[name="action"]:checked').value;
        if (action === "delete_events") {
            deleteEvents();
        } else {
            removeDates();
        }
    }

    function successDialog(){
        var el = document.querySelector('#success_dialog');
        if (!el) {
            el = document.createElement('div');
            el.id = 'success_dialog';

            var div1 = document.createElement('div');
            div1.classList.add('ic-flash-success');
            el.appendChild(div1);

            var div2 = document.createElement('div');
            div2.classList.add('ic-flash__icon');
            div2.classList.add('aria-hidden="true"');
            div1.appendChild(div2);

            var icon = document.createElement('i');
            icon.classList.add('icon-check');
            div2.appendChild(icon);

            var msg = document.createTextNode("The action completed successfully!");
            div1.appendChild(msg);

            var button = document.createElement('button');
            button.type = 'button';
            button.classList.add("Button", "Button--icon-action", "close_link");
            el.appendChild(button);

            icon = document.createElement('i');
            icon.classList.add('ic-icon-x');
            icon.classList.add('aria-hidden="true"');
            button.appendChild(icon);

            var parent = document.querySelector('body');
            parent.appendChild(el);
        }
    }

    function open_success_dialog() {
        try {
            successDialog();
            $j('#success_dialog').dialog({
                autoOpen: false,
                closeOnEscape: false,
                open: function () {
                    $j(".ui-dialog-titlebar").hide();
                    $j(".ui-widget-content").css("background", "rgba(255, 255, 255, 0)");
                    $j(".ui-dialog.ui-widget-content").css("box-shadow", "none");
                },
                modal: true,
                resizable: false,
                height: 'auto',
                width: '40%',
            });
            if (!$j('#success_dialog').dialog('isOpen')) {
                $j('#success_dialog').dialog('open');
            }
        } catch (e) {
            console.log(e);
        }
    }

    function updateMsgs() {
        var msg = document.getElementById('events_msg');
        if (!msg) return;

        while (msg.firstChild) {
            msg.removeChild(msg.firstChild);
        }

        if (!errors || errors.length === 0) {
            msg.style.display = 'none';
        } else {
            var div1 = document.createElement('div');
            div1.classList.add('ic-flash-error');

            var div2 = document.createElement('div');
            div2.classList.add('ic-flash__icon', 'aria-hidden="true"');
            div1.appendChild(div2);

            var icon = document.createElement('i');
            icon.classList.add('icon-warning');
            div2.appendChild(icon);

            var ul = document.createElement('ul');
            errors.forEach(function(error) {
                var li = document.createElement('li');
                li.textContent = error;
                ul.appendChild(li);
            });
            div1.appendChild(ul);

            var button = document.createElement('button');
            button.type = 'button';
            button.classList.add("Button", "Button--icon-action", "close_link");

            icon = document.createElement('i');
            icon.classList.add('ic-icon-x', 'aria-hidden="true"');
            button.appendChild(icon);

            div1.appendChild(button);
            msg.appendChild(div1);
            msg.style.display = 'inline-block';
        }
    }
})();

