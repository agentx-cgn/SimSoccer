/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals CFG */

'use strict';

CFG = {

    Version :             0.1,

    fps:                 60,

    Debug: {
        maxMessages:       10,     // max SIM Messages
        collectMessages:   false,
        maxCollisions:     10,     // remember at least X collisions
        collectCollisions: false,
        draw: {
            fps:           true,   // draw FPS 
            info:          true,   // draw Deb info
            speed:         true,   // draw Deb render info
            mouse:         false,  // draw mouse circle
            messages:      true,   // draw SIM messages
            collisions:    true,   // draw PHY collisions
        }          
    },

    Physics: {
        drag:             0.01,    // 'Air drag' of integrator
        angularFriction:  0.99,    // balls only
    },

    Screen : {
        marginTop:       32,       // size of topbar
        backcolor:       'rgba(153, 170, 153, 1)' // a nice green

    },

    Field: {

        margin:          5,     // meter
        lineWidth :      0.5,   // meter
        lineColor :      'rgba(240, 240, 240, 0.9)',

        width  :         70,  // meter
        length :        110,

        radiuscircle:     9.15,
        strafraum:       16.5,
        torraum:          5.5,
        cornerRadius:     1.0
    },

    Goal: {
        width  :          3.66,
        length  :         7.32,
        space:            5.5,
        fillColor:        'rgba(200, 200, 200, 0.4)',
    },

    Ball: {
        name:            'ball',
        styles:           {fill: '#F00', stroke: '#DDD', angleIndicator: '#E33', mark: '#FF0', select: 'rgba(255, 255, 0, 0.4)'},
        mass:             0.43,  // 0.41 < 0.45
        radius:           0.7,   // Umfang: 0.68 < 0.70
        cof:              1.0,   // A cof of 1 has no slide.
        restitution:      1.0,   // A restitution of 0 is not bouncy.
    },

    Posts: {
        name:             'post',
        treatment:        'static',
        styles:           {fill: 'rgba(40, 40, 40, 0.9)', stroke: 'rgba(255, 0, 0, 0.9)', mark: '#FF0', select: '#F0F'},
        width:            0.5,
        height:           0.5,
        restitution:      0.5,
        cof:              0.9,
        // upper left corners
        xcoords:           [           -0.5,      -0.5,             110,       110],
        ycoords:           [35 - 3.66 - 0.5, 35 + 3.66, 35 - 3.66 - 0.5, 35 + 3.66]
    },

    // players are all variable, min max
    Player: {            
        name:            'player',
        styles:          {
            fill:           '#0F0', 
            stroke:         '#DDD', 
            angleIndicator: '#E33', 
            mark:           '#FF0', 
            select:         'rgba(255, 255, 0, 0.4)'
        },
        mass:            60,        //[60, 100], // kg
        speed:           10,        // ms
        accel:            5,        // ms²
        width:            1,
        height:           3,
        cof:              1.0,
        restitution:      1.0,
        angle:            0.0,       //  positive is clockwise starting along the x axis
        marked:        false,
        selected:      false,
    },

    minimumPlayers:       1,

    Rules: {
        momFoul:          2,   // if sum of momentum (vel * mass) is higher => spotkick
        momFoulYellow:    4,   // yellow + spotkick
        momFoulRed:       6,   // red + spotkick
    },

    Teams : [
        { 
            abbr:     'H', 
            name:     'Hunters', 
            styles:   {fill: '#66F', stroke: '#FFF', angleIndicator: '#00F'},
            players : {
                 '1': {sign: 'Sam', role: 'TW', mass: 100, x:  2.0, y: 35, angle: 0, styles: {stroke: '#000'}},
                 '2': {sign: 'Sun', role: 'LV', mass: 100, x: 12.0, y: 30, angle: 0, styles: {}},
                 '3': {sign: 'Son', role: 'RV', mass: 100, x: 12.0, y: 40, angle: 0, styles: {}},
            }

        }, {
            abbr:     'P', 
            name:     'Predators', 
            styles:   {fill: '#0F0', stroke: '#FFF', angleIndicator: '#0F0'},
            players : {
                 '1': {sign: 'Yam', role: 'TW', mass: 100, x: 110 -  2.0, y: 35, angle: Math.PI, styles: {stroke: '#000'}},
                 '2': {sign: 'Yun', role: 'LV', mass: 100, x: 110 - 12.0, y: 30, angle: Math.PI, styles: {}},
                 '3': {sign: 'Yon', role: 'RV', mass: 100, x: 110 - 12.0, y: 40, angle: Math.PI, styles: {}},
            }

        }

    ],

    stages: {
        physics:   {
            training:  {},
            game:      [
                {    lineup : {} },
                {       run : {} },
                {    lineup : {} },
                {       run : {} },
                {    lineup : {} },
                {       run : {} },
                {    lineup : {} },
                {       run : {} },
                {    lineup : {} },
                { penalties : {} },
            ],
            party:     {},
        },

    }

};