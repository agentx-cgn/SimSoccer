/*jslint bitwise: true, browser: true, evil:true, devel: true, todo: true, debug: true, nomen: true, plusplus: true, sloppy: true, vars: true, white: true, indent: 2 */
/*jshint -W030 */
/*jshint -W069 */
/*globals IFC, BHV, CFG, H, REN, PHY, Physics */

'use strict';

BHV = (function(){

  const 
    TAU = Math.PI * 2,
    PI  = Math.PI,
    DEGRAD = Math.PI/180;

  var 
    self,
    world,
    behaviors = {},

    // lifted objects
    vector,
    options,
    position;


  return {

    boot:   function () {return (self = this);

    }, init: function(){

      world = PHY.world;
      self.createBehaviors();

      // enable mouse interaction
      world.add(Physics.behavior('interactive', { el: IFC.cvs }));

      self.add('players-marked-attractor');
      self.add('players-selected-steering');
      self.add('players-selected-targeting');
      self.add('players-focus-ball', {bodies: PHY.bodies.team0});
      self.add('balls-basic');      

      self.listen();

    }, add:    function(name, options){

      behaviors[name] =  Physics.behavior(name, options || {}),
      world.add(behaviors[name]);

    }, sub:    function(name){

      world.remove(behaviors[name]);    
      behaviors[name] = null;  


    }, 'listen': function(){

      world.on(

        { 'interact:poke': function( e ){
          
          // patched behavior
          if (!IFC.mouseOverBody && e.button === 0){
            // world.wakeUpAll();
            // behaviors['interactive'].options({pos: REN.toField(e)});
            // self.add( behaviors['interactive'] );
          }

        }, 'interact:move': function( e ){
          
          // behaviors['interactive'].options({pos: REN.toField(e)});
        
        }, 'interact:release': function(){
          
          // world.wakeUpAll();
          // self.sub( behaviors['interactive'] );

        }

      });



    }, 'players-selected-targeting': function(body){

      if (this.pos){


      }



    }, 'players-selected-steering': function(body){

      var angle  = body.state.angular.pos;

      options = this.options,

      REN.info.acce = this.accel;
      REN.info.turn = this.turn;

      if (this.accel !== undefined){
        vector = this.scratch.vector();
        vector.set(
          this.accel * options.amount * Math.cos( angle ), 
          this.accel * options.amount * Math.sin( angle ) 
        );
        body.accelerate( vector );
      }

      if (this.turn !== undefined){
        body.state.angular.vel = 0.3 * this.turn * DEGRAD;
      }


    }, 'players-focus-ball' : function (body) {

        position = this.scratch.vector().set(body.state.pos._[0], body.state.pos._[1]); 
        position.vsub( PHY.bodies.ball.state.pos );
        body.state.angular.pos = (position.angle() + PI) % TAU;


    }, 'balls-basic': function (body) {

      var
        x = body.state.pos._[0], 
        y = body.state.pos._[1], 
        isOff = (
          x + body.radius < 0 ||
          y + body.radius < 0 ||
          x - body.radius > CFG.Field.length ||
          y - body.radius > CFG.Field.width
        );

      if ( isOff ){
        if (SIM.game.state === 'running'){
          world.emit('game:ball-off-field', {x, y, player: body.player});
          PHY.stopBodies([ body ]);
        }
      }

      // slow rotation down
      body.state.angular.vel *= CFG.Physics.angularFriction; 


    }, 'players-marked-attractor': function (body) {

      var norm, options = this.options;

      if (options.pos){

        body.sleep(false);
      
        vector = this.scratch.vector()
          .clone( options.pos )
          .vsub( body.state.pos )
        ;

        norm = vector.norm();  // get the distance

        if (norm > options.min && norm < options.max){
          body.accelerate( vector.normalize().mult( options.strength / Math.pow(norm, options.order) ) );
        }

      }


    }, createBehaviors: function(){

      self.create('balls-basic', {bodies: PHY.bodies.balls});

      self.create('players-focus-ball', {scratch: true});

      self.create('players-selected-targeting', {
        pos:     Physics.vector(),
        filter:  {selected: true},
        listen: {
          'interact:poke': function( e ){
            if (e.button === 0){
              this.options.pos = REN.toField(e);
            }
          }, 
          'interact:release': function(){
            this.options.pos = null;
          }
        }
      });

      self.create('players-marked-attractor', {
        pos:     null, //Physics.vector(),
        filter:  {marked: true},
        scratch:  true,
        strength: 0.0015,
        order:    0,
        min:      1,
        max:    200,
        listen: {
          'interact:poke': function( e ){
            if (e.button === 0){
              this.options.pos = REN.toField(e);
            }
          }, 
          'interact:move': function(e){
            if (this.options.pos){
              this.options.pos = REN.toField(e);
            }
          },
          'interact:release': function(){
            this.options.pos = null;
          }
        }
      });


      self.create('players-selected-steering', {
        amount:  0.00001, 
        scratch: true,
        filter:  {selected: true},
        listen:  {
          'key:space': function(){this.accel = 0; this.turn = 0;},
          'key:up':    function(){
            this.accel = Math.round(Math.min(this.accel === undefined ? +0.5 : this.accel + 0.5, 5));
          },
          'key:down':  function(){
            this.accel = Math.round(Math.max(this.accel === undefined ? -0.5 : this.accel - 0.5, -5));
          },
          'key:right': function(){
            this.turn = Math.min(this.turn === undefined ? +0.1 : this.turn + 0.1, 0.4);
          },
          'key:left':  function(){
            this.turn = Math.max(this.turn === undefined ? -0.1 : this.turn - 0.1, -0.4);
          },
        }
      });


    }, create: function(name, defaults){

      var i, body, bodies, config = {}, behave = self[name];

      Physics.behavior (name, function ( parent ) {
        return {
          init: function ( options ) {
            H.extend(config, defaults, options);
            parent.init.call( this, config );
          },
          connect: function(world){
            world.on( 'integrate:positions', this.behave, this);
            if (config.listen){
              H.each(config.listen, (name, action) => {
                world.on(name, action, this);
              });
            }
          },
          disconnect: function(world){
            world.off( 'integrate:positions', this.behave, this);
            if (config.listen){
              H.each(config.listen, (name, action) => {
                world.off(name, action, this);
              });
            }
          },
          behave: function ( data ) {
            bodies = config.bodies || world.find(config.filter) || data.bodies;
            config.scratch && (this.scratch = Physics.scratchpad());
            for (i = 0; (body = bodies[i]); i++){
              behave.call(this, body);
            }
            config.scratch && this.scratch.done();
          }

        };
      });


    },

  };

}()).boot();



