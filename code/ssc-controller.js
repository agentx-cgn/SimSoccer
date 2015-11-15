/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*jshint -W069 */
/*globals IFC, BHV, CFG, H, REN, PHY, CTR, Physics, Controller */

'use strict';

CTR = (function(){

  const 
    TAU = Math.PI * 2,
    PI  = Math.PI,
    DEGRAD = Math.PI/180;

  var 
    self,
    controllers = {};

  function setVector (pos, vector){
    vector.set(pos.x, pos.y);
  }

  return {

    controllers,

    boot:   function () {return (self = this);

    }, reset: function(){

      self.cleanup();
      self.init();

    }, cleanup: function(){

      controllers = self.controllers = {};

    }, init: function(){

      self.listen();

    }, listen: function (name) {

      PHY.world.on({'integrate:positions': function(data){

        var b, body;

        H.each(controllers, (name, ctr) => {

          ctr.useScratch && (ctr.scratch = Physics.scratchpad());
        
          for (b=0; (body = ctr.bodies[b]); b++){
            ctr.behave(body);
          }

          ctr.useScratch && ctr.scratch.done();

        });

      }});


    }, activate: function (name) {

      var
        controller,
        parts    = name.split(':'),
        filter   = parts[0].split('-')[0],
        type     = parts[0].split('-')[1],
        definition = self[name];

      controller = self.controllers[name] = new Controller(definition);
      controller.activate();

      type === 'bodies'  && filter === 'all' && controller.addBodies(PHY.bodies.all); 
      type === 'players' && filter === 'all' && controller.addBodies(PHY.bodies.players); 
      type === 'balls'   && filter === 'all' && controller.addBodies(PHY.bodies.balls); 


    }, deactivate: function (name) {

      var controller = self.controllers[name];

      controller.removeBodies(); 
      controller.deactivate();
      self.controllers[name] = null;

    }, hasBody: function(body, controller){

      return H.contains(controllers[controller].bodies, body);

    }, ofBody: function(body){

      var list = [];

      H.each(self.controllers, (name, controller) => {
        if (H.contains(controller.bodies, body)){
          list.push(name);
        }
      });      

      return list;


    }, 'all-bodies:has-angular-friction': {

      behavior: 'has-angular-friction',


    }, 'some-bodies:can-be-dragged': {

      behavior: 'can-beam-to-point',

      listeners:  {
        'interact:poke': function( e ){
          if (e.button === 0 && IFC.bodyUnderMouse){
            this.addBody(IFC.bodyUnderMouse);
          }
        }, 
        'interact:move': function( e ){
          if (e.button === 0 && this.bodies.length){
            setVector(REN.toField(e), this.bodies[0].state.pos);
            setVector(REN.toField(e), this.bodies[0].state.old.pos);
          }
        }, 
        'interact:release': function(){
          this.removeBodies();
        }
      }


    }, 'marked-bodies:can-move-to-click': {

      behavior: 'can-be-forced-to-point',

      listeners: {
        'interact:poke': function( e ){
          if (e.button === 0 && !IFC.bodyUnderMouse){
            this.addBodies(PHY.find('marked'));
            this.bodies.forEach(body => {
              this.targets[body.uid] = new Physics.vector();
              setVector(REN.toField(e), this.targets[body.uid]);
            });
          }
        }, 
        'interact:release': function(){
          this.removeBodies();
        }
      }



    }

  };

}()).boot();
