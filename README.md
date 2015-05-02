COGS 121 Assignment 2 - Spring 2015
===========

Kane Chong
Philip Ngo

Note:
	-Please use the **Google Chrome** browser when trying out this webapp. We have not tested the UI and overall functionality with other browsers. 

Design Principles:

-One thing we added was a loading screen when looking at our d3 visualization for facebook liked pages. We did this because we pull about 40 pages from facebook and the information tied to them, which takes a while sometimes. The loading screen ensures the user knows that the webapp is loading the view, rather than seeing a blank page with nothing on there for more than 10 seconds. This idea follows Nielsen's Heuristic design principle of "Visibility of System Status".

-Another thing we added was the ability to unlink and link different social media accounts. Some users do not wish to forever grant access to their other accounts. Granting the ability to unlink their accounts after having seen the webapp allows users to have the freedom and control they desire, rather than being constrained. In other words, this follows the "User Control and Freedom" principle from Nielsen's Heuristics.

-We used a generalized principle of applying red to things users should be aware of such as the logout button or unlinking an account. Typically, those are actions that users do not want to do by mistake, so adding a red color helps them know to be careful.

-The default behavior for when a user tries to view a visualization with no instagram account connected was that the webapp would redirect them to the login page. We changed it so that instead, a message appears in red explaining what they must do to view the visualizations we have if they do not have an account connected. This is so the user knows the system flow of the webapp but also to avoid confusion when a user tries to view something and all of sudden, are redirected back the the login page. 