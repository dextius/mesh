import bottle
from bottle import get, post, request, redirect, response, abort
import simplejson as json

###############
#
# Globals
#
###############


#########################
#
# Mesh Tests 
#
#########################
@get('/test/mesh')
def testmesh():
	return "Mesh!"

@post('/test/postmesh')
def testpostmesh():
	return "Mesh!"

@get('/test/jsonmesh')
def testjsonmesh():
	return json.dump({ "test" : "Mesh!"})

application = bottle.default_app()
