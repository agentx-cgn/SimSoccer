# SimSoccer
A simple JavaScript Soccer Simulation with an Player AI

### Requirements

 * A browser supporting ES2015 (e.g. FF40+)  
   or Chrome w/ experimental JS (#enable-javascript-harmony)

### Status

 * *2015-11-23:*  
   Implemented own behavior factory w/ controllers  
   More steering behaviors (avoid/approach)  
   Imported paths from Hannibal  

 * *2015-10-14:*  
   Finite State Machine integrated, with promises  
   Tweener integrated  
   Distance service  
   Refactored for Chrome  

 * *2015-09-16:*  
   Physicsjs integrated  
   Garbage collections mostly eliminated  
   User interface allows to debug  
   Events work  
   Basic behaviors work  

### ToDo
   
  * Make teams adjust player behavior
  * Finish team & player classes
  * Bigger sandbox?
  * Behaviors: 
    * Calibration for players
  * Concept for skills


### Used Librairies
  
  * FSM State Machine, https://github.com/jakesgordon/javascript-state-machine
  * Mousetrap, http://craig.is/killing/mice
  * PhysicsJS, http://wellcaffeinated.net/PhysicsJS
  * Tween, https://github.com/sole/tween.js
