/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals CFG, H, StateMachine */

'use strict';

function Actor (options) {

} 

Actor.prototype = {
  constructor: Actor,
  state: function(){return this.fsm.current;}
};


function Player (options){

  Actor.call(this, options);
  H.extend(this.options);

}

Player.prototype = {
  constructor: Player,
};


function Team (options){

  Actor.call(this, options);
  H.extend(this, options);

  this.fsm = StateMachine.create({
    initial: 'None',
    events: [

      // Initial
      { name: 'setup',        from: 'None',            to: 'Setup'       },
      { name: 'train',        from: 'None',            to: 'Training'    },

      // Kickoff, Abstoss vom Mittelpunkt
      { name: 'forkickoff',   from: 'None',            to: 'ForKickoff'  },
      { name: 'kikkickoff',   from: 'None',            to: 'KikKickoff'  },
      { name: 'play',         from: 'ForKickoff',      to: 'Play'        },
      { name: 'play',         from: 'KikKickoff',      to: 'Play'        },

      // Einwurf, Throwin
      { name: 'forthrowin',   from: 'Play',             to: 'ForThrowin' },
      { name: 'kikthrowin',   from: 'Play',             to: 'KikThrowin' },
      { name: 'play',         from: 'ForThrowin',       to: 'Play'       },
      { name: 'play',         from: 'KikThrowin',       to: 'Play'       },

      // Ecke, Corner
      { name: 'forcorner',    from: 'Play',            to: 'ForCorner'   },
      { name: 'kikcorner',    from: 'Play',            to: 'KikCorner'   },
      { name: 'play',         from: 'ForCorner',       to: 'Play'        },
      { name: 'play',         from: 'KikCorner',       to: 'Play'        },

      // Freistoss, Free Kick
      { name: 'forfreekick',  from: 'Play',            to: 'ForFreekick' },
      { name: 'kikfreekick',  from: 'Play',            to: 'KikFreekick' },
      { name: 'play',         from: 'ForFreekick',     to: 'Play'        },
      { name: 'play',         from: 'KikFreekick',     to: 'Play'        },

      // Elfer, Penalty Kick
      { name: 'forpenalty',   from: 'Play',            to: 'ForPenalty'  },
      { name: 'kikpenalty',   from: 'Play',            to: 'KikPenalty'  },
      { name: 'play',         from: 'ForPenalty',      to: 'Play'        },
      { name: 'play',         from: 'KikPenalty',      to: 'Play'        },

      // Pause
      { name: 'pause',        from: 'Play',            to: 'Pause'       },

    ],

    callbacks: {
      onsetup:       (name, from, to, data) => {console.log('ev: onsetup',        this.id, name, from, to, data);},
      ontrain:       (name, from, to, data) => {console.log('ev: ontrain',        this.id, name, from, to, data);},
      onforkickoff:  (name, from, to, data) => {console.log('ev: onforkickoff',   this.id, name, from, to, data);},
      onkikkickoff:  (name, from, to, data) => {console.log('ev: onkikkickoff',   this.id, name, from, to, data);},
      onforthrowin:  (name, from, to, data) => {console.log('ev: onforthrowin',   this.id, name, from, to, data);},
      onkikthrowin:  (name, from, to, data) => {console.log('ev: onkikthrowin',   this.id, name, from, to, data);},
      onforcorner:   (name, from, to, data) => {console.log('ev: onforcorner',    this.id, name, from, to, data);},
      onkikcorner:   (name, from, to, data) => {console.log('ev: onkikcorner',    this.id, name, from, to, data);},
      onforfreekick: (name, from, to, data) => {console.log('ev: onforfreekick',  this.id, name, from, to, data);},
      onkikfreekick: (name, from, to, data) => {console.log('ev: onkikfreekick',  this.id, name, from, to, data);},
      onforpenalty:  (name, from, to, data) => {console.log('ev: onforpenalty',   this.id, name, from, to, data);},
      onkikpenalty:  (name, from, to, data) => {console.log('ev: onkikpenalty',   this.id, name, from, to, data);},
      onpause:       (name, from, to, data) => {console.log('ev: onpause',        this.id, name, from, to, data);},
    }

  });

}

Team.prototype = {
  constructor: Team,
};

