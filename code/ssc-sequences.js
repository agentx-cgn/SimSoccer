/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*globals  SEQ */
/*jshint -W030 */

'use strict';

SEQ = (function(){

  var 
    self
;

  return {

    'training:marked-kick-ball': {

      ball :   null ,
      group :  null ,
      player : null ,
      point :  null ,

      init : function ( w ) {

        w.nounify ( 'ball group player point' );

        w.find ( w.players.marked )
          .set  ( w.group )
        ;




      }, shoot: function (w, actor, item) {

        w.nounify('actor', actor, 'item', item);

        w.group.on
          .member(w.ball, w.item, w.group, w.actor)
          .remove(w.actor)
          .closest(w.ball)
          .capture(w.ball)
        ;

      }, capture: function (w, actor, item) {

        w.nounify('actor', actor, 'item', item);

        w.group.on
          .member(w.ball, w.item, w.group, w.actor)
          // .group.remove(w.actor)
          // .closest(w.ball)
          // .set(w.player)
          .shoot(w.ball)
        ;

      },
      pause: function (w, reason) {

      },

    }

  }; //return


}());
