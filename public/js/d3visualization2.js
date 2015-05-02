$(document).ready(function () {


  d3.json('/fbLikeInfo', function(err, dat) {

    var the_data = dat.data;
    var the_pages = [];

    for(var i = 0; i < the_data.length; ++i) {
      the_pages.push(
        {text: the_data[i].name, count: the_data[i].likes, about: the_data[i].about}
      );
    }

    //console.log(the_pages[1].about);

    var bubbleChart = new d3.svg.BubbleChart({
      supportResponsive: true,
      //container: => use @default
      size: 2000,
      //viewBoxSize: => use @default
      innerRadius: 1700 / 3.5,
      //outerRadius: => use @default
      radiusMin: 40,
      //radiusMax: use @default
      //intersectDelta: use @default
      //intersectInc: use @default
      //circleColor: use @default
      data: {
        items: the_pages,
        eval: function (item) {return item.count;},
        classed: function (item) {return item.text.split(" ").join("");}
      },
      plugins: [
        /*{
          name: "central-click",
          options: {
            text: "(See more detail)",
            style: {
              "font-size": "20px",
              "font-style": "italic",
              "font-family": "Source Sans Pro, sans-serif",
              //"font-weight": "700",
              "text-anchor": "middle",
              "fill": "white"
            },
            attr: {dy: "100px"},
            centralClick: function() {
              alert("Here is more details!!");
            }
          }
        },*/
        {
          name: "lines",
          options: {
            format: [
              {// Line #0
                textField: "count",
                classed: {count: true},
                style: {
                  "font-size": "28px",
                  "font-family": "Source Sans Pro, sans-serif",
                  "text-anchor": "middle",
                  fill: "white"
                },
                attr: {
                  dy: "0px",
                  x: function (d) {return d.cx;},
                  y: function (d) {return d.cy;}
                }
              },
              {// Line #1
                textField: "text",
                classed: {text: true},
                style: {
                  "font-size": "14px",
                  "font-family": "Source Sans Pro, sans-serif",
                  "text-anchor": "middle",
                  fill: "white"
                },
                attr: {
                  dy: "20px",
                  x: function (d) {return d.cx;},
                  y: function (d) {return d.cy;}
                }
              }
            ],
            centralFormat: [
              {// Line #0
                style: {"font-size": "75px"},
                attr: {}
              },
              {// Line #1
                style: {"font-size": "50px"},
                attr: {dy: "45px"}
              }            
            ]
          }
        }]
    });

    $('body').toggleClass('loaded');
  });

});
