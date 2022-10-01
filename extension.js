#!/usr/bin/gjs
//----------------------------------------------------------------------------------------
// Date    : 221001
// Version : 1.3
// Contact : rsdevelop.contact@gmail.com
//----------------------------------------------------------------------------------------
// TODO: - Add Font-Color (Green=ON, Orange=OFF, Red=ERROR)
//----------------------------------------------------------------------------------------

// Includes for Gnome-Libs
const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const Mainloop = imports.mainloop;
const Network = imports.ui.status.network;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;

//----------------------------------------------------------------------------------------

// Variables
const PROTECTION_OFF = "VP OFF"
const PROTECTION_ON  = "VP ON"

let protector;

//----------------------------------------------------------------------------------------

// VPN Protector class
const VPNProtector = new Lang.Class({
    Name: 'VPNProtector', Extends: PanelMenu.Button,

    _init: function ()
    {
        let running, deviceStr;
        this.running = false;
        this.stopped = false;
        this.parent(0.0, "VPN Protector", false);
        
        this.PROTECTION_STATE = new St.Label({
            text: _(PROTECTION_OFF),
            y_align: Clutter.ActorAlign.CENTER});

        this.actor.add_actor(this.PROTECTION_STATE);
        this.actor.connect('button-press-event', Lang.bind(this, this._setStatus));
        
        this._update();
    },//end init 

    _setStatus: function() {
        if (this.stopped == true) {
            this.running = false;
            this.stopped = false;
            this.PROTECTION_STATE.set_text(PROTECTION_OFF);
        }
        else {
            if (this.running == false) {
                this.running = true;
                this.PROTECTION_STATE.set_text(PROTECTION_ON);
            }//end if

            else {
                this.running = false;
                this.PROTECTION_STATE.set_text(PROTECTION_OFF);
            }//end else
        } //end else stopped

    },//end _setStatus

    // Mainloop update funtion
    _update: function() {
        
        if (this.running == true) {
            this._updateUI(this._isVPNActive());
        }//end if running

        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }//end if timeout

        this._timeout = Mainloop.timeout_add_seconds(3, Lang.bind(this, this._update));
        
    },//end _update

    // Update the text
    _updateUI: function(data) {
        if (data.length == 0) {
            this.PROTECTION_STATE.set_text("VPN DOWN");
            
            //Disable Wifi
            let resWifi = GLib.spawn_sync(null, ["/bin/bash", "-c", "nmcli radio all off"], null, GLib.SpawnFlags.SEARCH_PATH, null);
            if(resWifi == false) {
                this.PROTECTION_STATE.set_text("W_ERROR"); 
            }//end if wifi
            
            //Disable ethernet
            var devName = this._getWiredDevName();
            if (devName.length > 0) {
                var devName = this._getWiredDevName();
                var resNw = GLib.spawn_sync(null, ["/bin/bash", "-c", "nmcli dev disconnect " + devName], null, GLib.SpawnFlags.SEARCH_PATH, null);
                if (resNw == false) {
                    this.PROTECTION_STATE.set_text("E_ERROR"); 
                }//end if
            }//end if eth
            
            this.running = false;
            this.stopped = true;

        }//end data.length == 0
        else {
            global.log("ProtectMeVPN: VPN Active");
        }//end else

    },//end _updateUI

    //Checks if a vpn is active
    _isVPNActive: function() {
        // for open vpn
        var [res, vpn] = GLib.spawn_sync(null, ["/bin/bash", "-c", "nmcli con show --active | grep vpn"], null, GLib.SpawnFlags.SEARCH_PATH, null);
        if (vpn.length > 0)
            return vpn
        else {
            var [res, tun] = GLib.spawn_sync(null, ["/bin/bash", "-c", "nmcli con show --active | grep tun"], null, GLib.SpawnFlags.SEARCH_PATH, null);
            if (tun.length > 0)
                return tun
            else {
                var [res, wg] = GLib.spawn_sync(null, ["/bin/bash", "-c", "nmcli con show --active | grep wg"], null, GLib.SpawnFlags.SEARCH_PATH, null);
                return wg
            }
        }
    },//end _isVPNActive

    _getWiredDevName: function() {
        //Extract ethernet device name
        var [resm, out]= GLib.spawn_sync(null, ["/bin/bash", "-c", "nmcli con show"], null, GLib.SpawnFlags.SEARCH_PATH, null);
        var devName = out.toString()
        devName = devName.substring(devName.indexOf("ethernet") + 8 , devName.indexOf("ethernet") + 8 + 20)
        devName = devName.match("[a-z0-9]+")
        
        if (devName == null) {
            return "";
        }//end if

        else {
            return devName.toString();
        }//end else

    },//end _getWiredDevName

    _debugPrint: function(dataSrc) {
        global.log(dataSrc)
    }//end _debugPrint

});// end class VPNProtector

//----------------------------------------------------------------------------------------

function init() {
}

function enable() {
    protector = new VPNProtector;
    Main.panel.addToStatusArea('vpn-protector', protector);
}

function disable() {
    protector.distroy();
}

//----------------------------------------------------------------------------------------
