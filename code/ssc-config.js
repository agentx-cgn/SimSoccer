/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals CFG */

'use strict';

CFG = {

    Version :             0.1,

    fps:                 60,

    Debug: {
        maxMessages:       10,     // max SIM Messages
        collectMessages:   false,
        maxCollisions:      0,     // remember at least X collisions
        draw: {
            fps:           true,   // draw FPS 
            list:          true,   // draw Deb objects
            back:          true,   // draw background (green)
            info:          true,   // draw Deb info
            speed:         true,   // draw Deb render info
            mouse:         false,  // draw mouse circle
            effects:       true,   // draw former tasks
            sandbox:       true,   // draw outer 
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
        styles:           {fill: '#F00', stroke: '#DDD', angleIndicator: '#E33', mark: '#FF0', select: 'rgba(255, 255, 0, 0.4)', hover: 'rgba(255, 255, 255, 0.4)'},
        mass:             0.43,  // 0.41 < 0.45
        radius:           0.7,   // Umfang: 0.68 < 0.70
        cof:              1.0,   // A cof of 1 has no slide.
        restitution:      0.8,   // A restitution of 0 is not bouncy.

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
            select:         'rgba(255, 255, 0, 0.4)', 
            hover:          'rgba(255, 255, 255, 0.4)',
        },
        mass:            60,        //[60, 100], // kg
        speed:           10,        // ms
        accel:            5,        // ms²
        width:            1,
        height:           3,
        cof:              1.0,
        restitution:      0.4,
        angle:            0.0,       //  positive is clockwise starting along the x axis
        marked:        false,
        selected:      false,

    },

    Teams : [
        { 
            index:    0,
            abbr:     'H', 
            nick:     'TM0',
            name:     'Hunters', 
            styles:   {fill: '#66F', stroke: '#FFF', angleIndicator: '#00F'},
            players : {
                 '1': {sign: 'Sam', role: 'TW', mass: 100, x:  2.0, y: 35, angle: 0, styles: {stroke: '#000'}},
                 '2': {sign: 'Sun', role: 'LV', mass: 100, x: 12.0, y: 40, angle: 0, styles: {}},
                 '3': {sign: 'Son', role: 'RV', mass: 100, x: 12.0, y: 30, angle: 0, styles: {}},
            }

        }, {
            index:    1,
            abbr:     'P', 
            nick:     'TM1',
            name:     'Predators', 
            styles:   {fill: '#0F0', stroke: '#FFF', angleIndicator: '#0F0'},
            players : {
                 '1': {sign: 'Yam', role: 'TW', mass: 100, x: 110 -  2.0, y: 35, angle: Math.PI, styles: {stroke: '#000'}},
                 '2': {sign: 'Yun', role: 'LV', mass: 100, x: 110 - 12.0, y: 30, angle: Math.PI, styles: {}},
                 '3': {sign: 'Yon', role: 'RV', mass: 100, x: 110 - 12.0, y: 40, angle: Math.PI, styles: {}},
            }

        }

    ],

    Rules: {
        momFoul:          2,   // if sum of momentum (vel * mass) is higher => spotkick
        momFoulYellow:    4,   // yellow + spotkick
        momFoulRed:       6,   // red + spotkick

    },

    Controllers: {

        // apply to world, always active
        world:      [   
            'sweep-prune', 
            'body-collision-detection', 
            'body-impulse-response'
        ],

        simulation: {
            None:       [
                'all-bodies:has-angular-friction',
                'some-bodies:can-be-dragged',
                'marked-bodies:can-move-to-click',
                'selected-bodies:can-follow-mouse',
            ],
            Training:   [
                'all-bodies:has-angular-friction',
                'some-bodies:can-be-dragged',
            ],
            Setup:      [
                'all-bodies:has-angular-friction',
                'some-bodies:can-be-dragged',
            ],
        },

        team: {

            None:       [
            ],

            Pause:       [
            ],

            Training:       [
                'all-players:can-avoid-point',
                'all-players:can-approach-point',
            ],

            Setup:       [
                'all-players:can-avoid-point',
                'all-players:can-approach-point',
            ],



        }


    },

    States : {

        //    event,        // froms                                          // to

        simulation: [

            ['setup',        ['None', 'Training', 'Play'],                   'Setup'     ],
            ['training',     ['None', 'Setup', 'Play', 'Excercise'],         'Training'  ],
            ['play',         ['None', 'Setup',    'Training'],               'Play'      ],
            ['excercise',    ['Training'],                                   'Excercise' ],
        
        ],

        game:       [

            ['half1',        ['None', 'Pause'],                    'Half1'     ],
            ['half2',        ['Pause'],                            'Half2'     ],
            ['half3',        ['Pause'],                            'Half3'     ],
            ['half4',        ['Pause'],                            'Half4'     ],
            ['penalties',    ['Pause'],                            'Penalties' ],
            ['party',        ['Pause', 'Penalties'],               'Party'     ],
            ['pause',        ['None', 'Half1', 'Half2', 'Half3', 'Half4'], 'Pause'     ],

        ],

        team:       [
            // Initial and sim states
            ['setup',        ['None', 'Pause', 'Training'],          'Setup'       ],
            ['training',     ['None', 'Pause', 'Setup'],             'Training'    ],
            ['pause',        ['None', 'Play'],                       'Pause'       ],

            // Kickoff, Abstoss vom Mittelpunkt
            ['forkickoff',   'None',            'ForKickoff'  ],
            ['kikkickoff',   'None',            'KikKickoff'  ],
            ['forkickoff',   'Setup',           'ForKickoff'  ],
            ['kikkickoff',   'Setup',           'KikKickoff'  ],
            ['forkickoff',   'Training',        'ForKickoff'  ],
            ['kikkickoff',   'Training',        'KikKickoff'  ],
            ['play',         'ForKickoff',      'Play'        ],
            ['play',         'KikKickoff',      'Play'        ],

            // Einwurf, Throwin
            ['forthrowin',   'Play',            'ForThrowin'  ],
            ['kikthrowin',   'Play',            'KikThrowin'  ],
            ['play',         'ForThrowin',      'Play'        ],
            ['play',         'KikThrowin',      'Play'        ],

            // Ecke, Corner
            ['forcorner',    'Play',            'ForCorner'   ],
            ['kikcorner',    'Play',            'KikCorner'   ],
            ['play',         'ForCorner',       'Play'        ],
            ['play',         'KikCorner',       'Play'        ],

            // Freistoss, Free Kick
            ['forfreekick',  'Play',            'ForFreekick' ],
            ['kikfreekick',  'Play',            'KikFreekick' ],
            ['play',         'ForFreekick',     'Play'        ],
            ['play',         'KikFreekick',     'Play'        ],

            // Elfer, Penalty Kick
            ['forpenalty',   'Play',            'ForPenalty'  ],
            ['kikpenalty',   'Play',            'KikPenalty'  ],
            ['play',         'ForPenalty',      'Play'        ],
            ['play',         'KikPenalty',      'Play'        ],

        ],

        player:     [

            // Initial and sim states
            ['stay',        ['None', 'Walk', 'Run',  'Kick', 'Grab'], 'Stay' ],
            ['walk',        ['None', 'Stay', 'Run',  'Kick', 'Grab'], 'Walk' ],
            ['run',         ['None', 'Stay', 'Walk', 'Kick', 'Grab'], 'Run'  ],
            ['kick',        ['None', 'Stay', 'Walk', 'Run',  'Grab'], 'Kick' ],
            ['grab',        ['None', 'Stay', 'Walk', 'Run',  'Kick'], 'Grab' ],

        ],

    },

};