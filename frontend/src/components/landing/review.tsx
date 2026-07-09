import { Anchor, Cable, Users } from "lucide-react";
import React from "react";
const stats = [
  {
    text: "Questions answered by Askly",
    stat: "2.1M+",
    icon: <Users className="h-6 w-6 text-black" strokeWidth={1.5} />,
  },
  {
    text: "Study guides generated",
    stat: "450k+",
    icon: <Anchor className="h-6 w-6 text-black" strokeWidth={1.5} />,
  },
  {
    text: "Avg. grade improvement",
    stat: "+12%",
    icon: <Cable className="h-6 w-6 text-black" strokeWidth={1.5} />,
  },
];
const Review = () => {
  return (
    <div className=" p-2 py-20">
      <div className="w-full h-fit border rounded-3xl bg-black/20 p-4">
        <div className="flex gap-24 py-20 max-w-7xl mx-auto">
          <div>
            <div className="w-30 h-30 rounded-md border" />
            <h1 className="text-white text-xl mt-2">Amaka D.</h1>
            <p className="mt-1 font-normal">Computer Science, 300 Level</p>
            <p>University Student</p>
          </div>
          <div className="w-9/12 border-l-1 text-2xl pl-24">
            <h1>
              &ldquo;Askly helped me break down tough topics and practice with
              targeted quizzes. I study less but remember more.&rdquo;
            </h1>
          </div>
        </div>
        <div className="flex gap-12 border-t py-20 max-w-7xl mx-auto text-white">
          {stats.map((stat) => (
            <div
              key={stat.text}
              className="flex gap-8 items-center justify-center"
            >
              <div className="w-32 h-32 border bg-white flex justify-center items-center rounded-md">
                <div className="w-16 h-16 flex justify-center items-center bg-gray-200 rounded-md">
                  {stat.icon}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-5xl font-normal">{stat.stat}</div>
                <div className="text-sm font-[400]">{stat.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Review;
