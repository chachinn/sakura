/* Sakura Reading Garden Article Depth Compatibility v2
   The former interim long-form layer combined 3–5 different source records.
   Final Reading Garden Articles must instead be substantial adaptations of one
   verified source per learner reading, so multi-source stitching is retired. */
(function(){
'use strict';
if(window.SakuraReadingLongForm)return;
function init(){}
window.SakuraReadingLongForm=Object.freeze({version:2,retiredMultiSourceStitching:true,init,compose:async()=>false,get qualityArticleCount(){return 0},get composedCount(){return 0}});
}());
