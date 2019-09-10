#!/usr/bin/python
import socket
import http.server
from os import curdir, sep
import base64

PORT_NUMBER = 8080

def load_binary(file):
    with open(file, 'rb') as file:
        return file.read()

#This class will handles any incoming request from
#the browser
class myHandler(http.server.BaseHTTPRequestHandler):

	#Handler for the GET requests
	def do_GET(self):
		if self.path=="/":
			self.path="/src/workflow.html"

		try:
			#Check the file extension required and
			#set the right mime type

			sendReply = False
			if self.path.endswith(".html"):
				mimetype='text/html'
				sendReply = True
			if self.path.endswith(".jpg"):
				mimetype='image/jpg'
				sendReply = True
			if self.path.endswith(".png"):
				mimetype='image/png'
				sendReply = True
			if self.path.endswith(".gif"):
				mimetype='image/gif'
				sendReply = True
			if self.path.endswith(".js"):
				mimetype='application/javascript'
				sendReply = True
			if self.path.endswith(".css"):
				mimetype='text/css'
				sendReply = True
			if self.path.endswith(".ply"):
				mimetype='application/octet-stream'
				sendReply = True

			if sendReply == True:
				#Open the static file requested and send it
				f = curdir + sep + self.path
				self.send_response(200)
				self.send_header('Content-type',mimetype)
				self.end_headers()
				self.wfile.write(load_binary(f))
			return


		except IOError:
			self.send_error(404,'File Not Found: %s' % self.path)

try:
	#Create a web server and define the handler to manage the
	#incoming request
	server = http.server.HTTPServer(('', PORT_NUMBER), myHandler)
	print('Started httpserver on port ' , PORT_NUMBER)

	#Wait forever for incoming htto requests
	server.serve_forever()

except KeyboardInterrupt:
	print('^C received, shutting down the web server')
	server.socket.close()
