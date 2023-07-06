import "./App.css";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import moment from "moment/moment";

function App() {
  // State to store parsed data
  const [uniquePairs, setUniquePairs] = useState([]);
  const [topPair, setTopPair] = useState(null);

  const resultRows = ["Employee ID #1", "Employee ID #2", "Project ID", "Days worked"];

  useEffect(() => {
    // Inside this callback function we perform our side effects.
    let result = getTopPair(uniquePairs);
    setTopPair(result);
  }, [uniquePairs]);

  const changeHandler = (event) => {
    // Passing file data (event.target.files[0]) to parse using Papa.parse
    Papa.parse(event.target.files[0], {
      header: true,
      skipEmptyLines: true,
      complete: function ({ data }) {

        let uniqueEmp = {};
        let pairs = [];

        //Combine Emploers work
        for (let i = 0; i < data.length; i++) {
          let employee = data[i];
          let id = employee.EmpID;
          uniqueEmp[id] = {
            ...employee,
            projects: {
              ...(uniqueEmp.hasOwnProperty([id]) ? uniqueEmp[id].projects : {}),
              [employee.ProjectID]: {
                ProjectID: employee.ProjectID,
                duration: duration(employee.DateFrom, employee.DateTo),
                DateFrom: employee.DateFrom,
                DateTo: employee.DateTo
              },
            }

          };
        }
        let EmpArr = Object.values(uniqueEmp);

        // Make all possible pairs
        for (let i = 0; i < EmpArr.length; i++) {
          for (let j = i + 1; j < EmpArr.length; j++) {
            let e1 = EmpArr[i];
            let e2 = EmpArr[j];
            let commonProjects = intersectingKeys(e1.projects, e2.projects);
            let commonProjectsDeatils = [];
            let commonTime = commonProjects.reduce((sum, projId) => {

              let first = e1;
              let second = e2;
              //determine which employee went to work first
              if (moment(e1.projects[projId].DateFrom).isAfter(e2.projects[projId].DateFrom)) {
                first = e2;
                second = e1;
              }
              if (moment(first.projects[projId].DateTo).isBefore(second.projects[projId].DateFrom)) {
                //they didn't meet each other in this the project
                sum += 0;
                commonProjectsDeatils.push({ projId, days: 0 })
              }
              else {
                if (moment(first.projects[projId].DateTo).isAfter(second.projects[projId].DateTo)) {
                  //the new employee left first 
                  //and the total time with another employee 
                  //equals his own time spent on the project
                  sum += second.projects[projId].duration;
                  commonProjectsDeatils.push({ projId, days: second.projects[projId].duration })

                }
                else {
                  //the end date of the old employee minus the start date of the new employee
                  sum += duration(first.projects[projId].DateTo, second.projects[projId].DateFrom)
                  commonProjectsDeatils.push({ projId, days: duration(first.projects[projId].DateTo, second.projects[projId].DateFrom) })
                }
              }

              return sum;
            }, 0);
            pairs.push({ e1, e2, commonProjects, commonTime, commonProjectsDeatils });
          }
        }
        // Save all posible pairs in array format
        setUniquePairs(pairs);
      },
    });
  };

  const intersectingKeys = (...objects) => {
    return objects
      .map((object) => Object.keys(object))
      .sort((a, b) => a.length - b.length)
      .reduce((a, b) => a.filter((key) => b.includes(key)));
  };

  const duration = (from, to) => {
    let now = moment();
    let start = moment(from).isValid() ? moment(from) : now;
    let end = moment(to).isValid() ? moment(to) : now;

    //Difference in number of days
    let res = Math.abs(moment.duration(end.diff(start)).asDays());
    return res;
  };


  const getTopPair = (pairs) => pairs.sort((a, b) => b.commonTime - a.commonTime)[0];

  return (
    <div className="mainComponent">
      {/* File Uploader */}
      <input
        type="file"
        name="file"
        onChange={changeHandler}
        accept=".csv"
        className="csvPicker"
      />

      {/* Table */}
      {topPair && <table>
        <thead>
          <tr>
            {resultRows.map((rows, index) => <th key={index}>{rows}</th>)}
          </tr>
        </thead>
        <tbody>
          {topPair.commonProjectsDeatils
            .map(({ projId, days }, index) => {
              return (
                <tr key={index}>
                  <td>{topPair.e1.EmpID}</td>
                  <td>{topPair.e2.EmpID}</td>
                  <td>{projId}</td>
                  <td>{Math.floor(days)}</td>
                </tr>
              );
            })}
        </tbody>
      </table>}

    </div>
  );
}

export default App;
